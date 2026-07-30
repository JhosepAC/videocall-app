'use client'
import {useState} from 'react'
import Link from 'next/link'
import {sendPasswordResetEmail} from '../actions'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {ArrowLeft, CheckCircle, Mail} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'

export default function ForgotPasswordPage() {
    const {t} = useI18n()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    return (
        <div className="flex flex-col space-y-8 text-foreground">
            <div className="text-center space-y-2">
                <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20">
                    <Mail className="w-6 h-6 text-brand"/>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auth.forgot_password.heading')}</h1>
                <p className="text-sm text-muted-foreground">{t('auth.forgot_password.subtitle')}</p>
            </div>

            {sent ? (
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                        <CheckCircle className="w-8 h-8 text-brand"/>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {t('auth.forgot_password.success')}
                    </p>
                </div>
            ) : (
                <form
                    action={async (formData) => {
                        setError('')
                        const result = await sendPasswordResetEmail(formData)
                        if (result?.error) {
                            setError(result.error)
                        } else {
                            setSent(true)
                        }
                    }}
                    className="space-y-5"
                    autoComplete="off"
                >
                    <div className="space-y-2">
                        <Label htmlFor="email"
                               className="text-sm font-medium text-foreground/80">{t('auth.forgot_password.email_label')}</Label>
                        <div className="relative">
                            <Mail
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder={t('auth.forgot_password.email_placeholder')}
                                required
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                            {error}
                        </p>
                    )}

                    <Button type="submit"
                            className="w-full h-12 text-sm font-medium bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300 rounded-xl">
                        {t('auth.forgot_password.send_link')}
                    </Button>
                </form>
            )}

            <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-6">
                <Link href="/login"
                      className="inline-flex items-center gap-1.5 text-brand hover:text-brand-hover font-medium transition-colors">
                    <ArrowLeft className="w-4 h-4"/>
                    {t('auth.forgot_password.back_to_login')}
                </Link>
            </div>
        </div>
    )
}
