'use client'

import { useState, useTransition } from 'react'
import { Settings, User, Shield, Lock, LogOut, AtSign, CircleAlert, Loader2, CheckCircle2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { updateProfile, updatePassword, signOut } from './actions'

type Tab = 'account' | 'profile' | 'preferences' | 'security'

interface ProfileData {
    full_name: string
    username: string
    avatar_url: string | null
}

interface Props {
    email: string
    profile: ProfileData
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'account', label: 'Cuenta', icon: Settings },
    { key: 'profile', label: 'Perfil', icon: User },
    { key: 'preferences', label: 'Preferencias', icon: Shield },
    { key: 'security', label: 'Seguridad', icon: Lock },
]

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof User; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active
                ? 'bg-brand/10 text-brand shadow-sm border border-brand/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    )
}

export function SettingsView({ email, profile }: Props) {
    const [tab, setTab] = useState<Tab>('account')

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
                    <Settings className="w-5 h-5 text-brand" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
                    <p className="text-sm text-muted-foreground">Administra tu cuenta y preferencias</p>
                </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-4 mb-8 border-b border-border/50">
                {TABS.map((t) => (
                    <TabButton key={t.key} active={tab === t.key} icon={t.icon} label={t.label} onClick={() => setTab(t.key)} />
                ))}
            </div>

            {tab === 'account' && <AccountTab email={email} />}
            {tab === 'profile' && <ProfileTab profile={profile} />}
            {tab === 'preferences' && <PreferencesTab />}
            {tab === 'security' && <SecurityTab />}
        </div>
    )
}

function AccountTab({ email }: { email: string }) {
    const [isPending, startTransition] = useTransition()
    const [copied, setCopied] = useState(false)

    function handleCopy() {
        navigator.clipboard.writeText(email)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Correo electrónico</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Este es el correo asociado a tu cuenta. No se puede modificar.
                </p>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border/40 px-4 py-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{email}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                        {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Cerrar sesión</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Sal de tu cuenta en este dispositivo.
                </p>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        startTransition(async () => {
                            await signOut()
                        })
                    }}
                >
                    <Button
                        type="submit"
                        disabled={isPending}
                        variant="destructive"
                        className="rounded-xl"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <LogOut className="w-4 h-4" />
                        )}
                        <span>Cerrar sesión</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}

function ProfileTab({ profile }: { profile: ProfileData }) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

    const initials = getInitials(profile.full_name)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setResult(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await updateProfile(formData)
            setResult(res)
        })
    }

    return (
        <div className="max-w-2xl">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-brand to-brand-secondary" />
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <Avatar className="w-24 h-24 border-4 border-background shadow-md bg-muted">
                            <AvatarImage src={profile.avatar_url || ''} />
                            <AvatarFallback className="text-2xl text-muted-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-card-foreground/80">Nombre Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        defaultValue={profile.full_name}
                                        placeholder="Ej. Jhosep Argomedo"
                                        disabled={isPending}
                                        className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-card-foreground/80">Nombre de Usuario</Label>
                                <div className="relative">
                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="username"
                                        name="username"
                                        defaultValue={profile.username}
                                        placeholder="usuario_dev"
                                        disabled={isPending}
                                        className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {result?.error && (
                            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20" role="alert">
                                <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{result.error}</span>
                            </div>
                        )}

                        {result?.success && (
                            <div className="flex items-start gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-xl border border-green-500/20" role="status">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Perfil actualizado correctamente</span>
                            </div>
                        )}

                        <div className="pt-4 border-t border-border flex justify-end">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-brand hover:bg-brand-hover text-brand-foreground shadow-md rounded-xl"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function PreferencesTab() {
    return (
        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-12 flex flex-col items-center justify-center text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Preferencias</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                Aquí podrás personalizar tu experiencia. Próximamente.
            </p>
        </div>
    )
}

function SecurityTab() {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setResult(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await updatePassword(formData)
            setResult(res)
            if (res.success) {
                (e.target as HTMLFormElement).reset()
            }
        })
    }

    return (
        <div className="max-w-lg">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Cambiar contraseña</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Actualiza tu contraseña periódicamente para mantener tu cuenta segura.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground/80">
                            Contraseña Actual
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                disabled={isPending}
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground/80">
                            Nueva Contraseña
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                disabled={isPending}
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
                            Confirmar Nueva Contraseña
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                disabled={isPending}
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                    </div>

                    {result?.error && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20" role="alert">
                            <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{result.error}</span>
                        </div>
                    )}

                    {result?.success && (
                        <div className="flex items-start gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-xl border border-green-500/20" role="status">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Contraseña actualizada correctamente</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full h-12 text-sm font-medium bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300 rounded-xl"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Actualizar Contraseña'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
