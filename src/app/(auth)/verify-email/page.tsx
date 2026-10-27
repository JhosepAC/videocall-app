'use client'

import {Suspense} from 'react'
import Link from 'next/link'
import {ArrowLeft, ExternalLink, Mail} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useSearchParams} from 'next/navigation'

function VerifyEmailContent() {
    const {t} = useI18n()
    const searchParams = useSearchParams()
    const email = searchParams?.get('email') || t('auth.verify_email.your_email')

    return (
        <div className="auth-content auth-status">
            <div className="auth-status-icon">
                <Mail className="w-8 h-8 text-brand"/>
            </div>

            <div className="auth-heading">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t('auth.verify_email.heading')}
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {t('auth.verify_email.message')}{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                </p>
            </div>

            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="auth-text-link">
                <ExternalLink className="w-4 h-4" aria-hidden="true"/>{t('auth.verify_email.open_gmail')}
            </a>

            <p className="text-xs text-muted-foreground max-w-xs">
                {t('auth.verify_email.hint')}
            </p>

            <div className="auth-bottom">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-brand hover:text-brand-hover font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4"/>
                    {t('auth.verify_email.back_to_login')}
                </Link>
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyEmailContent/>
        </Suspense>
    )
}
