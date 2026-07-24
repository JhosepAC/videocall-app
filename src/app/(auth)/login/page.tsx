'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Loader2, CircleAlert } from 'lucide-react'

type FieldError = 'email' | 'form'

type ClientErrors = {
    email?: string
}

function getErrorConfig(code: string): { message: string; field: FieldError } | null {
    const map: Record<string, { message: string; field: FieldError }> = {
        empty_email: { message: 'El correo electrónico es obligatorio', field: 'email' },
        invalid_email: { message: 'Ingresa un correo electrónico válido', field: 'email' },
        invalid_credentials: { message: 'Correo o contraseña incorrectos', field: 'form' },
        email_not_confirmed: {
            message: 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada',
            field: 'form',
        },
        rate_limited: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos', field: 'form' },
        server_error: { message: 'Error del servidor. Intenta de nuevo más tarde', field: 'form' },
    }

    return map[code] ?? null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateClient(email: string): ClientErrors | null {
    const errors: ClientErrors = {}
    if (!email) {
        errors.email = 'El correo electrónico es obligatorio'
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Ingresa un correo electrónico válido'
    }
    return Object.keys(errors).length > 0 ? errors : null
}

export default function LoginPage() {
    const [isPending, startTransition] = useTransition()
    const [serverError, setServerError] = useState<string | null>(null)
    const [clientErrors, setClientErrors] = useState<ClientErrors | null>(null)

    function clearError(field: 'email') {
        setServerError(null)
        if (clientErrors?.[field]) {
            setClientErrors((prev) => {
                if (!prev) return null
                const next = { ...prev }
                delete next[field]
                return Object.keys(next).length > 0 ? next : null
            })
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const formData = new FormData(e.currentTarget)
        const email = (formData.get('email') as string)?.trim()

        const clientErr = validateClient(email)
        setClientErrors(clientErr)
        setServerError(null)

        if (clientErr) return

        startTransition(async () => {
            const result = await login(null, formData)
            if (result?.error) {
                setServerError(result.error)
            }
        })
    }

    const serverConfig = serverError ? getErrorConfig(serverError) : null
    const serverEmailError = serverConfig?.field === 'email' ? serverConfig.message : null
    const serverFormError = serverConfig?.field === 'form' ? serverConfig.message : null
    const clientEmailError = clientErrors?.email ?? null

    const emailError = clientEmailError ?? serverEmailError

    return (
        <div className="flex flex-col space-y-8 text-foreground">
            <div className="text-center space-y-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20">
                    <Lock className="w-6 h-6 text-brand" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Bienvenido de nuevo</h1>
                <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                        Correo Electrónico
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            autoComplete="email"
                            disabled={isPending}
                            onChange={() => clearError('email')}
                            aria-invalid={!!emailError}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                    {emailError && (
                        <p className="text-xs text-destructive flex items-center gap-1.5 mt-1" role="alert">
                            <CircleAlert className="w-3 h-3 shrink-0" />
                            <span>{emailError}</span>
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                        Contraseña
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isPending}
                            onChange={() => setServerError(null)}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                            tabIndex={-1}
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </div>

                {serverFormError && (
                    <div
                        className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20"
                        role="alert"
                    >
                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{serverFormError}</span>
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
                            <span>Iniciando sesión...</span>
                        </>
                    ) : (
                        'Iniciar Sesión'
                    )}
                </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-6">
                ¿No tienes una cuenta?{' '}
                <Link
                    href="/register"
                    className="text-brand hover:text-brand-hover font-medium underline underline-offset-4 transition-colors"
                >
                    Regístrate aquí
                </Link>
            </div>
        </div>
    )
}
