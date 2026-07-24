'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Mail, ExternalLink, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useSearchParams } from 'next/navigation'

function VerifyEmailContent() {
    const { t } = useI18n()
    const searchParams = useSearchParams()
    const email = searchParams?.get('email') || t('auth.verify_email.your_email')

    return (
        <div className="flex flex-col items-center text-center space-y-8 text-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                <Mail className="w-8 h-8 text-brand" />
            </div>

            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t('auth.verify_email.heading')}
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {t('auth.verify_email.message')}{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                </p>
            </div>

            <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
            >
                <Button className="w-full h-12 text-sm font-medium bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300 rounded-xl">
                    <ExternalLink className="w-4 h-4" />
                    {t('auth.verify_email.open_gmail')}
                </Button>
            </a>

            <p className="text-xs text-muted-foreground max-w-xs">
                {t('auth.verify_email.hint')}
            </p>

            <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-6 w-full">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-brand hover:text-brand-hover font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('auth.verify_email.back_to_login')}
                </Link>
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyEmailContent />
        </Suspense>
    )
}
