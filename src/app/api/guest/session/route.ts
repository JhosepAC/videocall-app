import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {logGuestEvent} from '@/lib/guest/analytics'
import {isPortfolioReferral} from '@/lib/guest/origin'
import {checkRateLimit, clientAddress, isSameOriginRequest} from '@/lib/guest/rate-limit'
import {
    GUEST_COOKIE_NAME,
    createGuestSession,
    publicGuestSession,
    verifyGuestSessionToken,
} from '@/lib/guest/session'
import {clearGuestCookie, setGuestCookie} from '@/lib/guest/server'

export const dynamic = 'force-dynamic'

function json(body: unknown, status = 200, headers?: Record<string, string>) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Cache-Control': 'no-store',
            ...headers,
        },
    })
}

async function currentUser() {
    try {
        const supabase = await createClient()
        const {data: {user}} = await supabase.auth.getUser()
        return user
    } catch {
        return null
    }
}

export async function GET(request: NextRequest) {
    const token = request.cookies.get(GUEST_COOKIE_NAME)?.value
    const user = await currentUser()

    if (user) {
        const response = json({authenticated: true, guest: null})
        if (token) {
            clearGuestCookie(response)
            logGuestEvent('guest_converted_to_user', {reason: 'authenticated_session'})
        }
        return response
    }

    if (!token) return json({guest: null})

    const session = await verifyGuestSessionToken(token)
    if (!session) {
        const response = json({guest: null, expired: true})
        clearGuestCookie(response)
        logGuestEvent('guest_session_expired')
        return response
    }

    return json({guest: publicGuestSession(session)})
}

export async function POST(request: NextRequest) {
    if (!isSameOriginRequest(request)) {
        return json({error: 'forbidden_origin'}, 403)
    }

    const limit = checkRateLimit(`guest-session:create:${clientAddress(request.headers)}`, 8, 60 * 60 * 1000)
    if (!limit.ok) {
        logGuestEvent('guest_access_failed', {reason: 'rate_limited'})
        return json({error: 'rate_limited'}, 429, {'Retry-After': String(limit.retryAfter)})
    }

    const user = await currentUser()
    if (user) {
        const response = json({error: 'already_authenticated'}, 409)
        if (request.cookies.get(GUEST_COOKIE_NAME)) clearGuestCookie(response)
        logGuestEvent('guest_access_failed', {reason: 'already_authenticated'})
        return response
    }

    let body: {referrer?: unknown; source?: unknown} = {}
    try {
        body = await request.json() as typeof body
    } catch {
        body = {}
    }

    const referrer = typeof body.referrer === 'string' ? body.referrer : ''
    const source = typeof body.source === 'string' ? body.source : ''

    // The referral is only a gate for the lowest-privilege guest modality; it
    // is validated, never trusted as an identity or permission source.
    if (!isPortfolioReferral(referrer, source)) {
        logGuestEvent('guest_access_failed', {reason: 'not_referred'})
        return json({error: 'not_referred'}, 403)
    }

    const created = await createGuestSession()
    if (!created) {
        logGuestEvent('guest_access_failed', {reason: 'unavailable'})
        return json({error: 'guest_unavailable'}, 503)
    }

    const response = json({guest: publicGuestSession(created.session)})
    setGuestCookie(response, created.token)
    logGuestEvent('guest_session_created', {origin: 'portfolio'})
    return response
}

export async function DELETE(request: NextRequest) {
    if (!isSameOriginRequest(request)) {
        return json({error: 'forbidden_origin'}, 403)
    }

    const response = json({ok: true})
    clearGuestCookie(response)

    if (request.cookies.get(GUEST_COOKIE_NAME)) {
        logGuestEvent('guest_session_closed')
    }

    return response
}
