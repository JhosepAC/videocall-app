import type {GuestEventData, GuestEventName} from './analytics'

/**
 * Fire-and-forget client analytics. Failures are ignored so the guest flow
 * never depends on the event endpoint.
 */
export function trackGuestEvent(event: GuestEventName, data: GuestEventData = {}): void {
    if (typeof window === 'undefined') return

    try {
        void fetch('/api/guest/events', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({event, ...data}),
            keepalive: true,
        }).catch(() => undefined)
    } catch {
        // Never surface analytics failures to the visitor.
    }
}

export interface GuestSessionResponse {
    guest: {
        id: string
        accountType: 'guest'
        displayName: string
        createdAt: string
        expiresAt: string
        origin: 'portfolio'
        sessionId: string
        permissions: {allowed: readonly string[]; denied: readonly string[]}
    } | null
    authenticated?: boolean
    expired?: boolean
}

export async function readGuestSession(): Promise<GuestSessionResponse | null> {
    try {
        const response = await fetch('/api/guest/session', {cache: 'no-store'})
        if (!response.ok) return null
        return await response.json() as GuestSessionResponse
    } catch {
        return null
    }
}

export async function requestGuestSession(referrer: string, source: string | null): Promise<{
    ok: boolean
    status: number
    guest?: GuestSessionResponse['guest']
    error?: string
}> {
    try {
        const response = await fetch('/api/guest/session', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({referrer, source}),
            cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({})) as { guest?: GuestSessionResponse['guest']; error?: string }
        return {ok: response.ok, status: response.status, guest: payload.guest, error: payload.error}
    } catch {
        return {ok: false, status: 0, error: 'network_error'}
    }
}

export async function closeGuestSession(): Promise<boolean> {
    try {
        const response = await fetch('/api/guest/session', {method: 'DELETE', cache: 'no-store'})
        return response.ok
    } catch {
        return false
    }
}
