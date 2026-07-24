'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, CheckCircle, CircleAlert, Loader2 } from 'lucide-react'
import { useI18n } from '@/components/i18n/i18n-provider'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PASSWORD_RULES = [
    { label: 'password_rules.min_chars', test: (p: string) => p.length > 6 },
    { label: 'password_rules.uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'password_rules.number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'password_rules.special', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(p) },
]

const ERROR_MAP: Record<string, string> = {
    empty_email: 'errors.empty_email',
    invalid_email: 'errors.invalid_email',
    empty_password: 'errors.empty_password',
    weak_password: 'errors.weak_password',
    passwords_dont_match: 'errors.passwords_dont_match',
    email_already_registered: 'errors.email_already_registered',
    server_error: 'errors.server_error',
}

export default function RegisterPage() {
    const { t } = useI18n()
    const [isPending, startTransition] = useTransition()
    const [serverError, setServerError] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setServerError(null)

        const formData = new FormData(e.currentTarget)
        const email = (formData.get('email') as string)?.trim()

        if (!email) {
            setServerError('empty_email')
            return
        }
        if (!EMAIL_REGEX.test(email)) {
            setServerError('invalid_email')
            return
        }
        if (!password) {
            setServerError('empty_password')
            return
        }
        if (password.length <= 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(password)) {
            setServerError('weak_password')
            return
        }
        if (password !== confirmPassword) {
            setServerError('passwords_dont_match')
            return
        }

        startTransition(async () => {
            const result = await signup(null, formData)
            if (result?.error) {
                setServerError(result.error)
            }
        })
    }

    return (
        <div className="flex flex-col space-y-8 text-foreground">
            <div className="text-center space-y-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20">
                    <Lock className="w-6 h-6 text-brand" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auth.register.heading')}</h1>
                <p className="text-sm text-muted-foreground">{t('auth.register.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                        {t('auth.register.email_label')}
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t('auth.register.email_placeholder')}
                            autoComplete="email"
                            disabled={isPending}
                            onChange={() => setServerError(null)}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                        {t('auth.register.password_label')}
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isPending}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                    {password && (
                        <ul className="space-y-1.5 mt-2">
                            {PASSWORD_RULES.map((rule) => {
                                const valid = rule.test(password)
                                return (
                                    <li key={rule.label} className="flex items-center gap-2">
                                        <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${valid ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                                        <span className={`text-xs ${valid ? 'text-green-600 font-medium' : 'text-muted-foreground/60'}`}>
                                            {t(rule.label)}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-sm font-medium text-foreground/80">
                        {t('auth.register.confirm_password_label')}
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isPending}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-destructive flex items-center gap-1.5 mt-1" role="alert">
                            <CircleAlert className="w-3 h-3 shrink-0" />
                            <span>{t('errors.passwords_dont_match')}</span>
                        </p>
                    )}
                </div>

                {serverError && (
                    <div
                        className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20"
                        role="alert"
                    >
                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{t(ERROR_MAP[serverError] || serverError)}</span>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 text-sm font-medium bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t('auth.register.creating_account')}</span>
                        </>
                    ) : (
                        t('auth.register.create_account')
                    )}
                </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-6">
                {t('auth.register.has_account')}{' '}
                <Link
                    href="/login"
                    className="text-brand hover:text-brand-hover font-medium underline underline-offset-4 transition-colors"
                >
                    {t('auth.register.login_link')}
                </Link>
            </div>
        </div>
    )
}
