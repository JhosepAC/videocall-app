/**
 * Small in-memory sliding-window limiter for guest endpoints.
 *
 * This protects a single Node process. Serverless deployments may run several
 * instances, so the limit is best-effort there; it is still enough to stop a
 * trivial loop from creating sessions or spamming events. A shared store
 * (Redis/Upstash) is the documented next step for strict global limits.
 */

interface RateLimitResult {
    ok: boolean
    retryAfter: number
}

const buckets = new Map<string, number[]>()
const MAX_BUCKETS = 5_000

function prune(now: number, windowMs: number) {
    for (const [key, hits] of buckets) {
        const recent = hits.filter(hit => now - hit < windowMs)
        if (recent.length) buckets.set(key, recent)
        else buckets.delete(key)
    }
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const hits = (buckets.get(key) ?? []).filter(hit => now - hit < windowMs)

    if (hits.length >= limit) {
        buckets.set(key, hits)
        const oldest = hits[0] ?? now
        return {ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))}
    }

    hits.push(now)
    buckets.set(key, hits)

    if (buckets.size > MAX_BUCKETS) prune(now, windowMs)

    return {ok: true, retryAfter: 0}
}

export function clientAddress(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]!.trim()
    return headers.get('x-real-ip')?.trim() || headers.get('cf-connecting-ip')?.trim() || 'unknown'
}

export function isSameOriginRequest(request: Request): boolean {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (!host) return false

    if (origin) {
        try {
            const url = new URL(origin)
            const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
            const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol
            return url.host === host && url.protocol === protocol
        } catch {
            return false
        }
    }

    // Browsers always send one of these on same-origin fetch requests. A
    // request with neither is treated as cross-origin and rejected.
    return request.headers.get('sec-fetch-site') === 'same-origin'
}
