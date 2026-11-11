'use client'

import {useEffect, useRef, useState} from 'react'
import {usePathname, useRouter} from 'next/navigation'
import {ArrowRight, Check, Loader2} from 'lucide-react'
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog'
import {useI18n} from '@/components/i18n/i18n-provider'
import {detectPortfolioReferral} from '@/lib/guest/origin'
import {readGuestSession, requestGuestSession, trackGuestEvent} from '@/lib/guest/client'
import './portfolio-welcome.css'

const SEEN_KEY = 'mm_guest_prompt_seen'

function isEntrySurface(pathname: string): boolean {
    return !pathname.startsWith('/room') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/settings')
}

export function PortfolioWelcome() {
    const {t} = useI18n()
    const router = useRouter()
    const pathname = usePathname()
    const primaryRef = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const entrySurface = isEntrySurface(pathname)
    const [wasEntrySurface, setWasEntrySurface] = useState(entrySurface)

    // Derived state during render: leaving an entry surface closes the offer
    // without an effect-driven render cascade.
    if (wasEntrySurface !== entrySurface) {
        setWasEntrySurface(entrySurface)
        if (!entrySurface) setOpen(false)
    }

    useEffect(() => {
        if (!entrySurface || typeof window === 'undefined') return
        if (sessionStorage.getItem(SEEN_KEY) === '1') return

        const detection = detectPortfolioReferral(document.referrer, window.location.search)
        if (!detection.detected) return

        trackGuestEvent('portfolio_referral_detected', {signal: detection.signal ?? undefined})

        let cancelled = false
        void (async () => {
            const current = await readGuestSession()
            if (cancelled) return
            if (current?.authenticated || current?.guest) return

            sessionStorage.setItem(SEEN_KEY, '1')
            setOpen(true)
            trackGuestEvent('guest_modal_displayed', {surface: 'entry'})
        })()

        return () => {
            cancelled = true
        }
    }, [entrySurface])

    async function enterAsGuest() {
        if (busy) return
        setBusy(true)
        setError(null)
        trackGuestEvent('guest_access_requested', {surface: 'welcome_modal'})

        const source = new URLSearchParams(window.location.search).get('source')
        const result = await requestGuestSession(document.referrer, source)

        if (result.ok) {
            // The server logs guest_session_created when the cookie is issued.
            setOpen(false)
            router.replace('/dashboard')
            router.refresh()
            return
        }

        trackGuestEvent('guest_access_failed', {reason: result.error || 'unknown'})
        setBusy(false)

        if (result.status === 409) {
            setOpen(false)
            router.replace('/dashboard')
            router.refresh()
            return
        }

        if (result.status === 429) setError(t('guest.error_rate_limited'))
        else if (result.status === 503) setError(t('guest.error_unavailable'))
        else if (result.status === 403) setError(t('guest.error_not_referred'))
        else setError(t('guest.error_generic'))
    }

    function goToRegister() {
        trackGuestEvent('guest_registration_started', {surface: 'welcome_modal'})
        setOpen(false)
        router.push('/register')
    }

    function dismiss() {
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(next) => {
            if (!next) dismiss()
        }}>
            <DialogContent
                className="portfolio-dialog"
                overlayClassName="portfolio-dialog-backdrop"
                showCloseButton={false}
                initialFocus={primaryRef}
            >
                <div className="portfolio-dialog-brand">
                    <span className="portfolio-dialog-mark" aria-hidden="true">
                        <svg width="20" height="18" viewBox="0 0 29 24" fill="none">
                            <rect x="1" y="2" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/>
                            <rect x="10" y="5" width="18" height="18" rx="6" stroke="currentColor" strokeWidth="1.7"/>
                        </svg>
                    </span>
                    <span>MeetMesh</span>
                    <span className="portfolio-dialog-mode">{t('guest.badge')}</span>
                </div>

                <DialogTitle className="portfolio-dialog-title">{t('guest.modal_title')}</DialogTitle>
                <DialogDescription className="portfolio-dialog-lead">{t('guest.modal_body')}</DialogDescription>
                <p className="portfolio-dialog-note">{t('guest.modal_note')}</p>

                <ul className="portfolio-dialog-facts">
                    <li><Check size={15} aria-hidden="true"/>{t('guest.modal_fact_rooms')}</li>
                    <li><Check size={15} aria-hidden="true"/>{t('guest.modal_fact_chat')}</li>
                    <li><Check size={15} aria-hidden="true"/>{t('guest.modal_fact_time')}</li>
                </ul>

                {error && <p className="portfolio-dialog-error" role="alert">{error}</p>}

                <div className="portfolio-dialog-actions">
                    <button
                        ref={primaryRef}
                        type="button"
                        className="portfolio-dialog-primary"
                        onClick={() => void enterAsGuest()}
                        disabled={busy}
                    >
                        {busy ? <Loader2 size={17} className="portfolio-dialog-spinner" aria-hidden="true"/> : null}
                        <span>{busy ? t('guest.entering') : t('guest.enter')}</span>
                        {!busy ? <ArrowRight size={17} aria-hidden="true"/> : null}
                    </button>
                    <div className="portfolio-dialog-secondary">
                        <button type="button" onClick={goToRegister} disabled={busy}>{t('guest.prefer_register')}</button>
                        <button type="button" onClick={dismiss} disabled={busy}>{t('guest.not_now')}</button>
                    </div>
                </div>

                <p className="portfolio-dialog-footnote">{t('guest.modal_footnote')}</p>
            </DialogContent>
        </Dialog>
    )
}
