'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { completeProfile } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { User, AtSign, Link2, Loader2, CircleAlert } from 'lucide-react'

const ERROR_MAP: Record<string, string> = {
    not_authenticated: 'Debes iniciar sesión para completar tu perfil',
    empty_full_name: 'El nombre completo es obligatorio',
    empty_username: 'El nombre de usuario es obligatorio',
    empty_avatar_url: 'La URL del avatar es obligatoria',
    server_error: 'Error del servidor. Intenta de nuevo más tarde.',
}

export default function CompleteProfilePage() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [serverError, setServerError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login')
                return
            }
            supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setFullName(data.full_name || '')
                        setUsername(data.username || '')
                        setAvatarUrl(data.avatar_url || '')
                    }
                    setLoading(false)
                })
        })
    }, [router])

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setServerError(null)

        if (!fullName.trim()) {
            setServerError('empty_full_name')
            return
        }
        if (!username.trim()) {
            setServerError('empty_username')
            return
        }
        if (!avatarUrl.trim()) {
            setServerError('empty_avatar_url')
            return
        }

        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await completeProfile(null, formData)
            if (result?.error) {
                setServerError(result.error)
            }
        })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm">Cargando...</p>
            </div>
        )
    }

    const initials = fullName
        ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    return (
        <div className="flex flex-col space-y-8 text-foreground">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Completa tu perfil
                </h1>
                <p className="text-sm text-muted-foreground">
                    Configura tu identidad para las salas de videoconferencia
                </p>
            </div>

            <div className="bg-card border-border shadow-sm rounded-2xl overflow-hidden transition-all">
                <div className="h-28 bg-gradient-to-r from-brand to-brand-secondary" />
                <div className="px-8 pb-6">
                    <div className="relative flex justify-between items-end -mt-12 mb-4">
                        <Avatar className="w-22 h-22 border-4 border-background shadow-md bg-muted">
                            {avatarUrl && (
                                <AvatarImage src={avatarUrl} />
                            )}
                            <AvatarFallback className="text-2xl text-muted-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-card-foreground">
                            {fullName || 'Nombre Completo'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            @{username || 'username'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium text-foreground/80">
                        Nombre Completo
                    </Label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="full_name"
                            name="full_name"
                            type="text"
                            placeholder="Ej. Jhosep Argomedo"
                            autoComplete="name"
                            disabled={isPending}
                            value={fullName}
                            onChange={(e) => {
                                setFullName(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-foreground/80">
                        Nombre de Usuario
                    </Label>
                    <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            placeholder="usuario_dev"
                            autoComplete="username"
                            disabled={isPending}
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="avatar_url" className="text-sm font-medium text-foreground/80">
                        URL del Avatar
                    </Label>
                    <div className="relative">
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="avatar_url"
                            name="avatar_url"
                            type="url"
                            placeholder="https://ejemplo.com/avatar.jpg"
                            disabled={isPending}
                            value={avatarUrl}
                            onChange={(e) => {
                                setAvatarUrl(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                {serverError && (
                    <div
                        className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20"
                        role="alert"
                    >
                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{ERROR_MAP[serverError] || serverError}</span>
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
                            <span>Guardando...</span>
                        </>
                    ) : (
                        'Ir al Dashboard'
                    )}
                </Button>
            </form>
        </div>
    )
}
