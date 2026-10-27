'use client'

import Link from 'next/link'
import {useState, useTransition} from 'react'
import {ArrowRight, Check, Loader2, Mail} from 'lucide-react'
import {signup} from '../actions'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {FieldError, PasswordField, PasswordRequirements, PASSWORD_RULES} from '@/components/auth/auth-fields'
import {useI18n} from '@/components/i18n/i18n-provider'

type Errors = {email?: string; password?: string; confirm_password?: string; form?: string}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
    const {t} = useI18n()
    const [isPending, startTransition] = useTransition()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [confirmTouched, setConfirmTouched] = useState(false)
    const [errors, setErrors] = useState<Errors>({})
    const mismatch = confirmTouched && !!confirm && confirm !== password
    const matches = !!confirm && confirm === password

    function clear(field: keyof Errors) {
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
        if (!password) next.password = 'errors.empty_password'
        else if (!PASSWORD_RULES.every(rule => rule.test(password))) next.password = 'errors.weak_password'
        if (!confirm || confirm !== password) next.confirm_password = 'errors.passwords_dont_match'
        setErrors(next)
        if (Object.keys(next).length) {
            form.querySelector<HTMLInputElement>(`#${Object.keys(next)[0]}`)?.focus()
            return
        }
        startTransition(async () => {
            const result = await signup(null, data)
            if (result?.error) {
                const code = result.error
                const field = ['empty_email', 'invalid_email', 'email_already_registered'].includes(code) ? 'email'
                    : ['empty_password', 'weak_password'].includes(code) ? 'password'
                    : code === 'passwords_dont_match' ? 'confirm_password' : 'form'
                setErrors({[field]: `errors.${field === 'form' ? 'server_error' : code}`})
            }
        })
    }

    return <div className="auth-content">
        <div className="auth-heading"><h1>{t('auth.register.heading')}</h1><p>{t('auth.register.subtitle')}</p></div>
        <form onSubmit={handleSubmit} noValidate className="auth-form" aria-busy={isPending}>
            <div className="auth-field">
                <Label htmlFor="email">{t('auth.register.email_label')}</Label>
                <div className="auth-input-wrap"><Mail className="auth-input-icon" size={17} aria-hidden="true"/>
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder={t('auth.register.email_placeholder')} className="auth-input" disabled={isPending}
                        aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} onChange={() => clear('email')}/>
                </div>
                <FieldError id="email-error" message={errors.email}/>
            </div>
            <div className="auth-field">
                <Label htmlFor="password">{t('auth.register.password_label')}</Label>
                <PasswordField id="password" name="password" autoComplete="new-password" placeholder="••••••••" disabled={isPending} value={password}
                    aria-invalid={!!errors.password} aria-describedby={`password-requirements${errors.password ? ' password-error' : ''}`}
                    onChange={e => {setPassword(e.target.value); clear('password'); clear('confirm_password')}}/>
                <PasswordRequirements password={password}/>
                <FieldError id="password-error" message={errors.password}/>
            </div>
            <div className="auth-field">
                <Label htmlFor="confirm_password">{t('auth.register.confirm_password_label')}</Label>
                <PasswordField id="confirm_password" name="confirm_password" autoComplete="new-password" placeholder="••••••••" disabled={isPending} value={confirm}
                    aria-invalid={!!errors.confirm_password || mismatch} aria-describedby={errors.confirm_password || mismatch ? 'confirm-error' : matches ? 'confirm-match' : undefined}
                    onBlur={() => setConfirmTouched(true)} onChange={e => {setConfirm(e.target.value); clear('confirm_password')}}/>
                <FieldError id="confirm-error" message={errors.confirm_password || (mismatch ? 'errors.passwords_dont_match' : null)}/>
                {matches && <p id="confirm-match" className="auth-match" role="status"><Check size={14} aria-hidden="true"/>{t('auth.experience.passwords_match')}</p>}
            </div>
            <FieldError id="form-error" message={errors.form}/>
            <Button type="submit" disabled={isPending} className="auth-submit">
                {isPending ? <><Loader2 className="animate-spin" size={17}/>{t('auth.register.creating_account')}</> : <>{t('auth.register.create_account')}<ArrowRight size={17}/></>}
            </Button>
        </form>
        <p className="auth-bottom">{t('auth.register.has_account')} <Link href="/login">{t('auth.register.login_link')}</Link></p>
    </div>
}
