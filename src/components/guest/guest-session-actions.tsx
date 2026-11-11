'use client'

import {useState} from 'react'
import {Loader2, LogOut} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {closeGuestSession} from '@/lib/guest/client'

interface Props {
    className?: string
    variant?: 'quiet' | 'solid'
}

export function GuestSignOutButton({className, variant = 'quiet'}: Props) {
    const {t} = useI18n()
    const [busy, setBusy] = useState(false)

    async function close() {
        if (busy) return
        setBusy(true)
        await closeGuestSession()
        window.location.assign('/')
    }

    const base = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-wait'
    const style = variant === 'solid'
        ? 'bg-foreground text-background px-4 py-2.5 hover:opacity-85'
        : 'border border-border/70 bg-background/40 px-4 py-2.5 text-foreground hover:bg-muted/60'

    return (
        <button type="button" onClick={() => void close()} disabled={busy}
                className={`${base} ${style} ${className || ''}`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4"/>}
            <span>{busy ? t('guest.closing') : t('guest.close_session')}</span>
        </button>
    )
}
