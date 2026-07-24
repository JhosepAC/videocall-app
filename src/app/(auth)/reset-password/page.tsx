'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, CheckCircle, LoaderCircle } from 'lucide-react'
import Link from 'next/link'

type View = 'loading' | 'form' | 'success' | 'invalid'

export default function ResetPasswordPage() {
    const [view, setView] = useState<View>('loading')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setView('form')
            } else {
                setView('invalid')
            }
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden')
            return
        }

        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            setError(error.message)
            return
        }

        setView('success')
    }

    if (view === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LoaderCircle className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm">Verificando enlace...</p>
            </div>
        )
    }

    if (view === 'invalid') {
        return (
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <Lock className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">Enlace inválido o expirado</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        El enlace de recuperación ya no es válido. Solicita uno nuevo.
                    </p>
                </div>
                <Link href="/forgot-password">
                    <Button className="bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl px-6">
                        Solicitar nuevo enlace
                    </Button>
                </Link>
            </div>
        )
    }

    if (view === 'success') {
        return (
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                    <CheckCircle className="w-8 h-8 text-brand" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">Contraseña actualizada</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Tu contraseña se ha restablecido correctamente.
                    </p>
                </div>
                <Link href="/login">
                    <Button className="bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl px-8 h-12 text-sm font-medium shadow-lg hover:shadow-brand/25 transition-all duration-300">
                        Iniciar Sesión
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-8 text-foreground">
            <div className="text-center space-y-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20">
                    <Lock className="w-6 h-6 text-brand" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Nueva contraseña</h1>
                <p className="text-sm text-muted-foreground">Ingresa tu nueva contraseña</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Nueva Contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-sm font-medium text-foreground/80">Confirmar Contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="confirm"
                            name="confirm"
                            type="password"
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                        {error}
                    </p>
                )}

                <Button type="submit" className="w-full h-12 text-sm font-medium bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300 rounded-xl">
                    Actualizar Contraseña
                </Button>
            </form>
        </div>
    )
}
