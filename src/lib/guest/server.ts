import {cookies} from 'next/headers'
import type {NextResponse} from 'next/server'
import {
    GUEST_COOKIE_NAME,
    guestCookieOptions,
    verifyGuestSessionToken,
    type GuestSessionPayload,
} from './session'

/**
 * Reads and verifies the guest session from the request cookies.
 * Returns null for missing, tampered, expired or unavailable sessions.
 */
export async function getGuestSession(): Promise<GuestSessionPayload | null> {
    try {
        const store = await cookies()
        const token = store.get(GUEST_COOKIE_NAME)?.value
        return await verifyGuestSessionToken(token)
    } catch {
        return null
    }
}

/**
 * Deletes the guest cookie from a Server Action or Route Handler context.
 */
export async function clearGuestSessionCookie(): Promise<void> {
    try {
        const store = await cookies()
        store.delete(GUEST_COOKIE_NAME)
    } catch {
        // Server Components cannot mutate cookies; middleware and route
        // handlers clear stale values on the next request.
    }
}

export function setGuestCookie(response: NextResponse, token: string): void {
    response.cookies.set(GUEST_COOKIE_NAME, token, guestCookieOptions())
}

export function clearGuestCookie(response: NextResponse): void {
    response.cookies.set(GUEST_COOKIE_NAME, '', {...guestCookieOptions(), maxAge: 0})
}
