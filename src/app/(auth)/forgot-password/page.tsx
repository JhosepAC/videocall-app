'use client'

import {useState, useTransition} from 'react'
import Link from 'next/link'
import {ArrowLeft, ArrowRight, Check, Loader2, Mail} from 'lucide-react'
import {sendPasswordResetEmail} from '../actions'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {FieldError} from '@/components/auth/auth-fields'
import {useI18n} from '@/components/i18n/i18n-provider'

export default function ForgotPasswordPage() {
    const {t} = useI18n()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    return <div className="auth-content">
        <div className="auth-heading"><h1>{t('auth.forgot_password.heading')}</h1><p>{t('auth.forgot_password.subtitle')}</p></div>
        {sent ? <div className="auth-status" role="status">
            <div className="auth-status-icon"><Check size={26}/></div>
            <p>{t('auth.forgot_password.success')}</p>
        </div> : <form className="auth-form" aria-busy={pending} onSubmit={e => {
            e.preventDefault()
            setError('')
            const data = new FormData(e.currentTarget)
            startTransition(async () => {
                const result = await sendPasswordResetEmail(data)
                if (result?.error) setError('errors.server_error')
                else setSent(true)
            })
        }}>
            <div className="auth-field">
                <Label htmlFor="email">{t('auth.forgot_password.email_label')}</Label>
                <div className="auth-input-wrap"><Mail className="auth-input-icon" size={17} aria-hidden="true"/>
                    <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} placeholder={t('auth.forgot_password.email_placeholder')} className="auth-input" onChange={() => setError('')}/>
                </div>
            </div>
            <FieldError id="reset-email-error" message={error}/>
            <Button type="submit" disabled={pending} className="auth-submit">
                {pending ? <><Loader2 size={17} className="animate-spin"/>{t('common.loading')}</> : <>{t('auth.forgot_password.send_link')}<ArrowRight size={17}/></>}
            </Button>
        </form>}
        <Link href="/login" className="auth-text-link"><ArrowLeft size={15}/>{t('auth.forgot_password.back_to_login')}</Link>
    </div>
}
