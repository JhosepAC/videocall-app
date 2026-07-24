'use client'

import { useState, useTransition, useEffect } from 'react'
import { ArrowLeft, Settings, User, Shield, Lock, LogOut, AtSign, Link2, Copy, Check, CircleAlert, Loader2, CheckCircle2, Mail, Sun, Moon, Monitor, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { updateProfile, updatePassword, signOut } from './actions'

type Tab = 'account' | 'profile' | 'preferences' | 'security'
type Theme = 'light' | 'dark' | 'system'
type Lang = 'es' | 'en'

const PASSWORD_RULES = [
    { label: 'Más de 6 caracteres', test: (p: string) => p.length > 6 },
    { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Al menos un signo especial', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(p) },
]

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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer w-full sm:w-auto ${active
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
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
            <div className="flex items-start gap-3 mb-8">
                <a
                    href="/dashboard"
                    className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                    aria-label="Volver al dashboard"
                >
                    <ArrowLeft className="w-5 h-5" />
                </a>
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
                    <p className="text-sm text-muted-foreground">Administra tu cuenta y preferencias</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-1.5 pb-4 mb-8 border-b border-border/50">
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
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Correo electrónico</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Este es el correo asociado a tu cuenta. No se puede modificar.
                </p>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border/40 px-4 py-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{email}</span>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 cursor-pointer"
                        aria-label="Copiar correo"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
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
    const [fullName, setFullName] = useState(profile.full_name)
    const [username, setUsername] = useState(profile.username)
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')

    const initials = getInitials(fullName)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setResult(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await updateProfile(formData)
            if (res.success) {
                setFullName((formData.get('fullName') as string) || fullName)
                setUsername((formData.get('username') as string) || username)
                setAvatarUrl((formData.get('avatarUrl') as string) || avatarUrl)
            }
            setResult(res)
        })
    }

    return (
        <div className="max-w-2xl">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-brand to-brand-secondary" />
                <div className="px-4 pb-4 sm:px-8 sm:pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-md bg-muted">
                            <AvatarImage src={avatarUrl} />
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
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
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
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="usuario_dev"
                                        disabled={isPending}
                                        className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avatarUrl" className="text-card-foreground/80">URL del Avatar</Label>
                            <div className="relative">
                                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="avatarUrl"
                                    name="avatarUrl"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://ejemplo.com/avatar.jpg"
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
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as Theme) || 'system'
        }
        return 'system'
    })
    const [lang, setLang] = useState<Lang>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('lang') as Lang) || 'es'
        }
        return 'es'
    })

    useEffect(() => {
        localStorage.setItem('theme', theme)
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else if (theme === 'light') {
            root.classList.remove('dark')
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.toggle('dark', prefersDark)
        }
    }, [theme])

    useEffect(() => {
        localStorage.setItem('lang', lang)
        document.documentElement.setAttribute('lang', lang)
    }, [lang])

    function applyTheme(t: Theme) {
        setTheme(t)
    }

    function applyLang(l: Lang) {
        setLang(l)
    }

    const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
        { value: 'light', label: 'Claro', icon: Sun },
        { value: 'dark', label: 'Oscuro', icon: Moon },
        { value: 'system', label: 'Sistema', icon: Monitor },
    ]

    const langOptions: { value: Lang; label: string }[] = [
        { value: 'es', label: 'Español' },
        { value: 'en', label: 'English' },
    ]

    return (
        <div className="max-w-lg space-y-6">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Tema</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Personaliza la apariencia de la aplicación.
                </p>
                <div className="flex gap-2">
                    {themeOptions.map((opt) => {
                        const Icon = opt.icon
                        const active = theme === opt.value
                        return (
                            <button
                                key={opt.value}
                                onClick={() => applyTheme(opt.value)}
                                className={`flex flex-1 flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${active
                                    ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${active ? 'text-brand' : ''}`} />
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Idioma</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Selecciona el idioma de la interfaz.
                </p>
                <div className="flex gap-2">
                    {langOptions.map((opt) => {
                        const active = lang === opt.value
                        return (
                            <button
                                key={opt.value}
                                onClick={() => applyLang(opt.value)}
                                className={`flex flex-1 items-center gap-2 px-3 sm:px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${active
                                    ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <Languages className={`w-4 h-4 ${active ? 'text-brand' : ''}`} />
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function SecurityTab() {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
    const [newPassword, setNewPassword] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setResult(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const res = await updatePassword(formData)
            setResult(res)
            if (res.success) {
                setNewPassword('')
            }
        })
    }

    return (
        <div className="max-w-lg">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
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
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value)
                                    setResult(null)
                                }}
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                        {newPassword && (
                            <ul className="space-y-1.5 mt-2">
                                {PASSWORD_RULES.map((rule) => {
                                    const valid = rule.test(newPassword)
                                    return (
                                        <li key={rule.label} className="flex items-center gap-2">
                                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${valid ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                                            <span className={`text-xs ${valid ? 'text-green-600 font-medium' : 'text-muted-foreground/60'}`}>
                                                {rule.label}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
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
