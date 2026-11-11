/**
 * Guest funnel events.
 *
 * The project has no analytics provider, so events are emitted as structured
 * server logs with a stable `[guest-analytics]` prefix. That keeps the feature
 * dependency-free and lets any log drain (Vercel, Datadog, etc.) index them.
 * Only coarse, non-personal fields are accepted; no referrer URLs, emails, IPs
 * or session tokens are stored.
 */

export const GUEST_EVENT_NAMES = [
    'portfolio_referral_detected',
    'guest_modal_displayed',
    'guest_access_requested',
    'guest_session_created',
    'guest_access_failed',
    'guest_session_expired',
    'guest_registration_started',
    'guest_converted_to_user',
    'guest_session_closed',
] as const

export type GuestEventName = typeof GUEST_EVENT_NAMES[number]

export type GuestEventData = Record<string, string | number | boolean | undefined>

const ALLOWED_EVENT_NAMES = new Set<string>(GUEST_EVENT_NAMES)
const ALLOWED_DATA_KEYS = new Set(['surface', 'result', 'reason', 'signal'])
const MAX_VALUE_LENGTH = 48

export function isGuestEventName(value: unknown): value is GuestEventName {
    return typeof value === 'string' && ALLOWED_EVENT_NAMES.has(value)
}

export function sanitizeGuestEventData(input: unknown): GuestEventData {
    if (!input || typeof input !== 'object') return {}

    const output: GuestEventData = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (!ALLOWED_DATA_KEYS.has(key)) continue
        if (typeof value === 'string') output[key] = value.slice(0, MAX_VALUE_LENGTH)
        else if (typeof value === 'number' && Number.isFinite(value)) output[key] = value
        else if (typeof value === 'boolean') output[key] = value
    }
    return output
}

export function logGuestEvent(event: GuestEventName, data: GuestEventData = {}): void {
    if (process.env.GUEST_ANALYTICS_LOG === 'off') return

    console.info('[guest-analytics]', JSON.stringify({
        event,
        at: new Date().toISOString(),
        ...sanitizeGuestEventData(data),
    }))
}
