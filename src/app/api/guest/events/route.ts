import {NextRequest, NextResponse} from 'next/server'
import {isGuestEventName, logGuestEvent, sanitizeGuestEventData} from '@/lib/guest/analytics'
import {checkRateLimit, clientAddress, isSameOriginRequest} from '@/lib/guest/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    if (!isSameOriginRequest(request)) {
        return new NextResponse(null, {status: 403})
    }

    const limit = checkRateLimit(`guest-events:${clientAddress(request.headers)}`, 120, 60 * 1000)
    if (!limit.ok) {
        return new NextResponse(null, {status: 429, headers: {'Retry-After': String(limit.retryAfter)}})
    }

    let body: {event?: unknown} & Record<string, unknown> = {}
    try {
        body = await request.json() as typeof body
    } catch {
        return new NextResponse(null, {status: 400})
    }

    if (!isGuestEventName(body.event)) {
        return new NextResponse(null, {status: 400})
    }

    const data = sanitizeGuestEventData(body)
    logGuestEvent(body.event, data)

    return new NextResponse(null, {status: 204, headers: {'Cache-Control': 'no-store'}})
}
