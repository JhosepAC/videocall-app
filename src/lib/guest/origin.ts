/**
 * Portfolio referral detection.
 *
 * A referral is a *signal*, never an identity proof: the visitor can spoof a
 * referrer or a query parameter. It only unlocks the guest access offer, which
 * grants the lowest privilege set in the application.
 */

export const PORTFOLIO_HOSTNAME = 'jhosep-ac.pages.dev'
export const PORTFOLIO_SOURCE = 'portfolio'

export type ReferralSignal = 'referrer' | 'source' | null

export interface ReferralDetection {
    detected: boolean
    signal: ReferralSignal
}

/**
 * Exact hostname + HTTPS. `URL` normalises the hostname, so lookalikes such as
 * `jhosep-ac.pages.dev.ejemplo.com` or `jhosep-ac.pages.dev@evil.com` never
 * match.
 */
export function isPortfolioReferrer(referrer: string | null | undefined): boolean {
    if (!referrer) return false

    try {
        const url = new URL(referrer)
        return url.protocol === 'https:' && url.hostname === PORTFOLIO_HOSTNAME
    } catch {
        return false
    }
}

export function isPortfolioSource(source: string | null | undefined): boolean {
    return source === PORTFOLIO_SOURCE
}

export function detectPortfolioReferral(referrer: string | null | undefined, search: string): ReferralDetection {
    const source = new URLSearchParams(search).get('source')
    const byReferrer = isPortfolioReferrer(referrer)
    const bySource = isPortfolioSource(source)

    if (!byReferrer && !bySource) return {detected: false, signal: null}
    return {detected: true, signal: byReferrer ? 'referrer' : 'source'}
}

/**
 * Server-side equivalent used when a guest session is requested. The frontend
 * forwards its original referrer because the browser sends MeetMesh as the
 * `Referer` of the API call itself.
 */
export function isPortfolioReferral(referrer: string | null | undefined, source: string | null | undefined): boolean {
    return isPortfolioReferrer(referrer) || isPortfolioSource(source)
}
