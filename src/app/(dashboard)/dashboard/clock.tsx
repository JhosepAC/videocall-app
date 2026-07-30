'use client'

import {useEffect, useState} from 'react'
import {useI18n} from '@/components/i18n/i18n-provider'

function formatDate(d: Date, locale: string): string {
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function formatTime(d: Date, locale: string): string {
    return d.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})
}

export function Clock() {
    const {locale} = useI18n()
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    const localeStr = locale === 'es' ? 'es-ES' : 'en-US'

    return (
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-widest">
                {formatDate(now, localeStr)}
            </span>
            <span
                className="text-3xl md:text-4xl font-bold text-foreground tracking-tight tabular-nums leading-none mt-1">
                {formatTime(now, localeStr)}
            </span>
        </div>
    )
}
