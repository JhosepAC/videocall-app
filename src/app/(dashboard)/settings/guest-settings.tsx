'use client'

import Link from 'next/link'
import {ArrowLeft, ArrowRight, Check, Lock, UserRound} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {GuestSignOutButton} from '@/components/guest/guest-session-actions'

export function GuestSettings() {
    const {t} = useI18n()

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
            <div className="flex items-start gap-3 mb-8">
                <Link
                    href="/dashboard"
                    className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                    aria-label={t('nav.back_to_dashboard')}
                >
                    <ArrowLeft className="w-5 h-5"/>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('settings.heading')}</h1>
                    <p className="text-sm text-muted-foreground">{t('guest.settings_subtitle')}</p>
                </div>
            </div>

            <section
                className="rounded-2xl border border-border/50 bg-card/30 p-5 sm:p-6"
                aria-labelledby="guest-session-title"
            >
                <div className="flex items-start gap-4">
                    <span className="grid place-items-center w-11 h-11 rounded-xl bg-muted/70 text-foreground shrink-0">
                        <UserRound className="w-5 h-5"/>
                    </span>
                    <div className="min-w-0">
                        <h2 id="guest-session-title" className="text-lg font-semibold text-foreground">
                            {t('guest.settings_title')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            {t('guest.settings_body')}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-6">
                    <div className="rounded-xl bg-muted/40 p-4">
                        <h3 className="text-sm font-semibold text-foreground">{t('guest.settings_allowed_title')}</h3>
                        <ul className="mt-3 space-y-2">
                            {['guest.settings_allowed_rooms', 'guest.settings_allowed_chat', 'guest.settings_allowed_screen'].map(key => (
                                <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70"/>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-4">
                        <h3 className="text-sm font-semibold text-foreground">{t('guest.settings_restricted_title')}</h3>
                        <ul className="mt-3 space-y-2">
                            {['guest.settings_restricted_profile', 'guest.settings_restricted_password', 'guest.settings_restricted_save'].map(key => (
                                <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70"/>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-border/60 bg-background/50 p-4">
                    <p className="text-sm font-medium text-foreground">{t('guest.restricted_body')}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition-all hover:bg-brand-hover"
                        >
                            {t('guest.register_cta')}
                            <ArrowRight className="w-4 h-4"/>
                        </Link>
                        <GuestSignOutButton/>
                    </div>
                </div>
            </section>
        </div>
    )
}
