'use client'

import Link from 'next/link'
import {useState, useTransition} from 'react'
import {ArrowRight, Loader2, Mail} from 'lucide-react'
import {login} from '../actions'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {FieldError, PasswordField} from '@/components/auth/auth-fields'
import {useI18n} from '@/components/i18n/i18n-provider'

type Errors = {email?: string; password?: string; form?: string}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
    const {t} = useI18n()
    const [isPending, startTransition] = useTransition()
    const [errors, setErrors] = useState<Errors>({})

    function clear(field: 'email' | 'password') {
        setErrors(prev => ({...prev, [field]: undefined, form: undefined}))
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const data = new FormData(form)
        const email = String(data.get('email') ?? '').trim()
        const next: Errors = {}
        if (!email) next.email = 'errors.empty_email'
        else if (!EMAIL_REGEX.test(email)) next.email = 'errors.invalid_email'
        if (!data.get('password')) next.password = 'errors.empty_password'
        setErrors(next)
        if (Object.keys(next).length) {
            form.querySelector<HTMLInputElement>(`#${next.email ? 'email' : 'password'}`)?.focus()
            return
        }
        startTransition(async () => {
            const result = await login(null, data)
            if (result?.error) {
                const field = ['empty_email', 'invalid_email'].includes(result.error) ? 'email' : 'form'
                const known = ['empty_email', 'invalid_email', 'invalid_credentials', 'email_not_confirmed', 'rate_limited', 'server_error']
                setErrors({[field]: `errors.${known.includes(result.error) ? result.error : 'server_error'}`})
            }
        })
    }

    return <div className="auth-content">
        <div className="auth-heading"><h1>{t('auth.login.heading')}</h1><p>{t('auth.login.subtitle')}</p></div>
        <form onSubmit={handleSubmit} noValidate className="auth-form" aria-busy={isPending}>
            <div className="auth-field">
                <Label htmlFor="email">{t('auth.login.email_label')}</Label>
                <div className="auth-input-wrap"><Mail className="auth-input-icon" size={17} aria-hidden="true"/>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder={t('auth.login.email_placeholder')} className="auth-input" disabled={isPending}
                        aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} onChange={() => clear('email')}/>
                </div>
                <FieldError id="email-error" message={errors.email}/>
            </div>
            <div className="auth-field">
                <div className="auth-label-row"><Label htmlFor="password">{t('auth.login.password_label')}</Label>
                    <Link href="/forgot-password">{t('auth.login.forgot_password')}</Link></div>
                <PasswordField id="password" name="password" autoComplete="current-password" placeholder="••••••••" disabled={isPending}
                    aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} onChange={() => clear('password')}/>
                <FieldError id="password-error" message={errors.password}/>
            </div>
            <FieldError id="form-error" message={errors.form}/>
            <Button type="submit" disabled={isPending} className="auth-submit">
                {isPending ? <><Loader2 className="animate-spin" size={17}/>{t('auth.login.signing_in')}</> : <>{t('auth.login.sign_in')}<ArrowRight size={17}/></>}
            </Button>
        </form>
        <p className="auth-bottom">{t('auth.login.no_account')} <Link href="/register">{t('auth.login.register_link')}</Link></p>
    </div>
}
