'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, Settings, User, Shield, Lock, LogOut, AtSign, Link2, Copy, Check, CircleAlert, Loader2, CheckCircle2, Mail, Sun, Moon, Monitor, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/components/theme/theme-provider'
import { useI18n } from '@/components/i18n/i18n-provider'
import { updateProfile, updatePassword, savePreferences, signOut } from './actions'

type Tab = 'account' | 'profile' | 'preferences' | 'security'
type Lang = 'es' | 'en'

const PASSWORD_RULES: { labelKey: string; test: (p: string) => boolean }[] = [
    { labelKey: 'password_rules.min_chars', test: (p: string) => p.length > 6 },
    { labelKey: 'password_rules.uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { labelKey: 'password_rules.number', test: (p: string) => /[0-9]/.test(p) },
    { labelKey: 'password_rules.special', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(p) },
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

const TABS: { key: Tab; labelKey: string; icon: typeof User }[] = [
    { key: 'account', labelKey: 'settings.tabs.account', icon: Settings },
    { key: 'profile', labelKey: 'settings.tabs.profile', icon: User },
    { key: 'preferences', labelKey: 'settings.tabs.preferences', icon: Shield },
    { key: 'security', labelKey: 'settings.tabs.security', icon: Lock },
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
    const { t } = useI18n()

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
            <div className="flex items-start gap-3 mb-8">
                <a
                    href="/dashboard"
                    className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                    aria-label={t('nav.back_to_dashboard')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </a>
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('settings.heading')}</h1>
                    <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-1.5 pb-4 mb-8 border-b border-border/50">
                {TABS.map((tabDef) => (
                    <TabButton key={tabDef.key} active={tab === tabDef.key} icon={tabDef.icon} label={t(tabDef.labelKey)} onClick={() => setTab(tabDef.key)} />
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
    const { t } = useI18n()
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
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.account.email_title')}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.account.email_desc')}
                </p>
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border/40 px-4 py-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{email}</span>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 cursor-pointer"
                        aria-label={t('settings.account.copy_email')}
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.account.sign_out_title')}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.account.sign_out_desc')}
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
                        <span>{t('settings.account.sign_out')}</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}

function ProfileTab({ profile }: { profile: ProfileData }) {
    const { t } = useI18n()
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
                                <Label htmlFor="fullName" className="text-card-foreground/80">{t('settings.profile.full_name_label')}</Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder={t('settings.profile.full_name_placeholder')}
                                        disabled={isPending}
                                        className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-card-foreground/80">{t('settings.profile.username_label')}</Label>
                                <div className="relative">
                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="username"
                                        name="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={t('settings.profile.username_placeholder')}
                                        disabled={isPending}
                                        className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avatarUrl" className="text-card-foreground/80">{t('settings.profile.avatar_url_label')}</Label>
                            <div className="relative">
                                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="avatarUrl"
                                    name="avatarUrl"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder={t('settings.profile.avatar_url_placeholder')}
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
                                <span>{t('settings.profile.success')}</span>
                            </div>
                        )}

                        <div className="pt-4 border-t border-border flex justify-end">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-brand hover:bg-brand-hover text-brand-foreground shadow-md rounded-xl"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('settings.profile.save')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function PreferencesTab() {
    const { theme, setTheme } = useTheme()
    const { t, locale, setLocale } = useI18n()
    const [saving, setSaving] = useState(false)

    async function handleThemeChange(t: 'light' | 'dark' | 'system') {
        await setTheme(t)
        await savePreferences(t, locale)
    }

    async function handleLangChange(l: Lang) {
        setLocale(l)
        setSaving(true)
        await savePreferences(theme, l)
        setSaving(false)
    }

    const themeOptions: { value: 'light' | 'dark' | 'system'; labelKey: string; icon: typeof Sun }[] = [
        { value: 'light', labelKey: 'settings.preferences.light', icon: Sun },
        { value: 'dark', labelKey: 'settings.preferences.dark', icon: Moon },
        { value: 'system', labelKey: 'settings.preferences.system', icon: Monitor },
    ]

    const langOptions: { value: Lang; labelKey: string }[] = [
        { value: 'es', labelKey: 'settings.preferences.spanish' },
        { value: 'en', labelKey: 'settings.preferences.english' },
    ]

    return (
        <div className="max-w-lg space-y-6">
            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.preferences.theme_title')}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.preferences.theme_desc')}
                </p>
                <div className="flex gap-2">
                    {themeOptions.map((opt) => {
                        const Icon = opt.icon
                        const active = theme === opt.value
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleThemeChange(opt.value)}
                                className={`flex flex-1 flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${active
                                    ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${active ? 'text-brand' : ''}`} />
                                {t(opt.labelKey)}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.preferences.language_title')}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.preferences.language_desc')}
                </p>
                <div className="flex gap-2 items-center">
                    {langOptions.map((opt) => {
                        const active = locale === opt.value
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleLangChange(opt.value)}
                                disabled={saving}
                                className={`flex flex-1 items-center gap-2 px-3 sm:px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${active
                                    ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                <Languages className={`w-4 h-4 ${active ? 'text-brand' : ''}`} />
                                {t(opt.labelKey)}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function SecurityTab() {
    const { t } = useI18n()
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
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('settings.security.title')}</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    {t('settings.security.desc')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground/80">
                            {t('settings.security.current_password_label')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                placeholder={t('common.placeholder_password')}
                                required
                                autoComplete="current-password"
                                disabled={isPending}
                                className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:border-brand transition-all shadow-inner rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground/80">
                            {t('settings.security.new_password_label')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder={t('common.placeholder_password')}
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
                                        <li key={rule.labelKey} className="flex items-center gap-2">
                                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${valid ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                                            <span className={`text-xs ${valid ? 'text-green-600 font-medium' : 'text-muted-foreground/60'}`}>
                                                {t(rule.labelKey)}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">
                            {t('settings.security.confirm_new_password_label')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder={t('common.placeholder_password')}
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
                            <span>{t('settings.security.success')}</span>
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
                            t('settings.security.update')
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
