/**
 * Stateless guest sessions.
 *
 * The token is a compact HMAC-SHA256 signed payload stored in an HttpOnly
 * cookie. Verification uses Web Crypto only, so the same module works in the
 * Node.js runtime (route handlers, server components) and in the Edge
 * middleware.
 *
 * Guest sessions are deliberately not Supabase sessions: a guest never gets a
 * Supabase user, a profile row, or any registered-user capability. The token
 * grants the lowest privilege set listed below and nothing else.
 */

export const GUEST_COOKIE_NAME = 'mm_guest_session'
export const GUEST_SESSION_TTL_SECONDS = 60 * 60 * 2
export const GUEST_DISPLAY_NAME = 'Invitado de MeetMesh'
export const GUEST_ORIGIN = 'portfolio' as const

export const GUEST_ALLOWED_PERMISSIONS = [
    'dashboard.view',
    'room.create',
    'room.join',
    'room.media',
    'room.chat',
    'room.react',
    'room.raise_hand',
    'room.screen_share',
] as const

export const GUEST_DENIED_PERMISSIONS = [
    'account.manage',
    'profile.edit',
    'avatar.upload',
    'password.change',
    'settings.save',
    'guest.convert',
] as const

export type GuestPermission = typeof GUEST_ALLOWED_PERMISSIONS[number]

export interface GuestSessionPayload {
    v: 1
    gid: string
    sid: string
    iat: number
    exp: number
    origin: typeof GUEST_ORIGIN
}

export interface GuestSessionPublic {
    id: string
    accountType: 'guest'
    displayName: string
    createdAt: string
    expiresAt: string
    origin: typeof GUEST_ORIGIN
    sessionId: string
    permissions: {
        allowed: readonly GuestPermission[]
        denied: typeof GUEST_DENIED_PERMISSIONS
    }
}

const DEV_SECRET = 'meetmesh-development-only-guest-session-secret'
const MIN_SECRET_LENGTH = 32
const encoder = new TextEncoder()
const keyCache = new Map<string, Promise<CryptoKey | null>>()

function guestSecret(): string | null {
    const configured = process.env.GUEST_SESSION_SECRET?.trim()
    const production = process.env.NODE_ENV === 'production'

    if (configured) {
        // Fail closed: a short secret in production is treated as missing.
        if (production && configured.length < MIN_SECRET_LENGTH) return null
        return configured
    }

    // In development an ephemeral-but-stable secret keeps the flow testable.
    // Production never falls back to a known value.
    return production ? null : DEV_SECRET
}

function importKey(secret: string): Promise<CryptoKey | null> {
    const cached = keyCache.get(secret)
    if (cached) return cached

    const imported = crypto.subtle
        .importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify'])
        .catch(() => null)

    keyCache.set(secret, imported)
    return imported
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> | null {
    try {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
        const binary = atob(padded)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
        return bytes
    } catch {
        return null
    }
}

function isUuid(value: unknown): value is string {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function parsePayload(raw: string): GuestSessionPayload | null {
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null

        const payload = parsed as Record<string, unknown>
        if (payload.v !== 1) return null
        if (!isUuid(payload.gid) || !isUuid(payload.sid)) return null
        if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)) return null
        if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null
        if (payload.exp <= payload.iat) return null
        if (payload.origin !== GUEST_ORIGIN) return null

        return {
            v: 1,
            gid: payload.gid,
            sid: payload.sid,
            iat: payload.iat,
            exp: payload.exp,
            origin: GUEST_ORIGIN,
        }
    } catch {
        return null
    }
}

/**
 * Creates a signed guest session. Returns null when no usable secret is
 * configured, which lets callers fail closed with a 503 in production.
 */
export async function createGuestSession(now = Date.now()): Promise<{ token: string; session: GuestSessionPayload } | null> {
    const secret = guestSecret()
    if (!secret) return null

    const key = await importKey(secret)
    if (!key) return null

    const issuedAt = Math.floor(now / 1000)
    const session: GuestSessionPayload = {
        v: 1,
        gid: crypto.randomUUID(),
        sid: crypto.randomUUID(),
        iat: issuedAt,
        exp: issuedAt + GUEST_SESSION_TTL_SECONDS,
        origin: GUEST_ORIGIN,
    }

    const payloadBytes = new Uint8Array(encoder.encode(JSON.stringify(session)))
    const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)
    const token = `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(new Uint8Array(signature))}`

    return {token, session}
}

/**
 * Verifies signature, shape and expiry. Never throws.
 */
export async function verifyGuestSessionToken(token: string | null | undefined, now = Date.now()): Promise<GuestSessionPayload | null> {
    if (!token) return null

    const secret = guestSecret()
    if (!secret) return null

    const separator = token.indexOf('.')
    if (separator <= 0 || separator === token.length - 1) return null

    const encodedPayload = token.slice(0, separator)
    const encodedSignature = token.slice(separator + 1)
    const payloadBytes = base64UrlDecode(encodedPayload)
    const signatureBytes = base64UrlDecode(encodedSignature)
    if (!payloadBytes || !signatureBytes) return null

    const key = await importKey(secret)
    if (!key) return null

    try {
        const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
        if (!valid) return null
    } catch {
        return null
    }

    const payload = parsePayload(new TextDecoder().decode(payloadBytes))
    if (!payload) return null

    const nowSeconds = Math.floor(now / 1000)
    if (payload.exp <= nowSeconds) return null
    if (payload.iat > nowSeconds + 60) return null

    return payload
}

export function publicGuestSession(session: GuestSessionPayload): GuestSessionPublic {
    return {
        id: session.gid,
        accountType: 'guest',
        displayName: GUEST_DISPLAY_NAME,
        createdAt: new Date(session.iat * 1000).toISOString(),
        expiresAt: new Date(session.exp * 1000).toISOString(),
        origin: GUEST_ORIGIN,
        sessionId: session.sid,
        permissions: {
            allowed: GUEST_ALLOWED_PERMISSIONS,
            denied: GUEST_DENIED_PERMISSIONS,
        },
    }
}

export function guestCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: GUEST_SESSION_TTL_SECONDS,
    }
}
