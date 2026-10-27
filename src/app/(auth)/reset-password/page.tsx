'use client'
import {useEffect, useState, useTransition} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Button} from '@/components/ui/button'
import {PasswordField} from '@/components/auth/auth-fields'
import {Label} from '@/components/ui/label'
import {CheckCircle, LoaderCircle, Lock} from 'lucide-react'
import Link from 'next/link'
import {useI18n} from '@/components/i18n/i18n-provider'

type View = 'loading' | 'form' | 'success' | 'invalid'

export default function ResetPasswordPage() {
    const {t} = useI18n()
    const [view, setView] = useState<View>('loading')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()
    const [supabase] = useState(createClient)

    useEffect(() => {
        supabase.auth.getSession().then(({data}) => {
            if (data.session) {
                setView('form')
            } else {
                setView('invalid')
            }
        })
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError(t('auth.reset_password.error_min_length'))
            return
        }
        if (password !== confirm) {
            setError(t('auth.reset_password.error_mismatch'))
            return
        }

        startTransition(async () => {
            const {error} = await supabase.auth.updateUser({password})
            if (error) {
                setError(t('errors.server_error'))
                return
            }
            setView('success')
        })
    }

    if (view === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LoaderCircle className="w-8 h-8 animate-spin mb-4"/>
                <p className="text-sm">{t('auth.reset_password.loading')}</p>
            </div>
        )
    }

    if (view === 'invalid') {
        return (
            <div className="auth-status">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <Lock className="w-8 h-8 text-destructive"/>
                </div>
                <div className="space-y-2">
                    <h1>{t('auth.reset_password.invalid_heading')}</h1>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {t('auth.reset_password.invalid_message')}
                    </p>
                </div>
                <Link href="/forgot-password" className="auth-text-link">{t('auth.reset_password.request_new')}</Link>
            </div>
        )
    }

    if (view === 'success') {
        return (
            <div className="auth-status">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                    <CheckCircle className="w-8 h-8 text-brand"/>
                </div>
                <div className="space-y-2">
                    <h1>{t('auth.reset_password.success_heading')}</h1>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {t('auth.reset_password.success_message')}
                    </p>
                </div>
                <Link href="/login" className="auth-text-link">{t('auth.reset_password.sign_in')}</Link>
            </div>
        )
    }

    return (
        <div className="auth-content">
            <div className="auth-heading">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auth.reset_password.form_heading')}</h1>
                <p className="text-sm text-muted-foreground">{t('auth.reset_password.form_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" aria-busy={pending}>
                <div className="space-y-2">
                    <Label htmlFor="password"
                           className="text-sm font-medium text-foreground/80">{t('auth.reset_password.new_password_label')}</Label>
                        <PasswordField
                            id="password"
                            name="password"
                            disabled={pending}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={e => {setPassword(e.target.value); setError('')}}
                        />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm"
                           className="text-sm font-medium text-foreground/80">{t('auth.reset_password.confirm_password_label')}</Label>
                        <PasswordField
                            id="confirm"
                            name="confirm"
                            disabled={pending}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            value={confirm}
                            onChange={e => {setConfirm(e.target.value); setError('')}}
                        />
                </div>

                {error && (
                    <p className="auth-field-error" role="alert">
                        {error}
                    </p>
                )}

                <Button type="submit" disabled={pending} className="auth-submit">
                    {pending && <LoaderCircle size={17} className="animate-spin"/>}
                    {t(pending ? 'common.saving' : 'auth.reset_password.update')}
                </Button>
            </form>
        </div>
    )
}
