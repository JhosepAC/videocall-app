'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar } from '@/lib/supabase/storage'
import { completeProfile } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { User, AtSign, Camera, Loader2, CircleAlert, Upload, Trash2 } from 'lucide-react'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useDominantColor } from '@/hooks/useDominantColor'
import { getGradientFromColor } from '@/lib/utils'

const ERROR_MAP: Record<string, string> = {
    not_authenticated: 'errors.not_authenticated',
    empty_full_name: 'errors.empty_full_name',
    empty_username: 'errors.empty_username',
    server_error: 'errors.server_error',
    upload_failed: 'errors.upload_failed',
    invalid_file_type: 'errors.invalid_file_type',
    file_too_large: 'errors.file_too_large',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function CompleteProfilePage() {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [serverError, setServerError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dominantColor = useDominantColor(avatarPreview || avatarUrl || null)

    const displayUrl = avatarPreview || avatarUrl || ''

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

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        setServerError(null)
        const file = e.target.files?.[0]
        if (!file) return

        if (!ALLOWED_TYPES.includes(file.type)) {
            setServerError('invalid_file_type')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setServerError('file_too_large')
            return
        }

        setAvatarFile(file)
        const reader = new FileReader()
        reader.onload = (event) => {
            setAvatarPreview(event.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    function handleRemoveAvatar() {
        setAvatarFile(null)
        setAvatarPreview(null)
        setAvatarUrl('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            try {
                let finalAvatarUrl = avatarUrl || ''

                if (avatarFile) {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) {
                        setServerError('not_authenticated')
                        return
                    }
                    finalAvatarUrl = await uploadAvatar(user.id, avatarFile)
                }

                formData.set('avatar_url', finalAvatarUrl)

                const result = await completeProfile(null, formData)
                if (result?.error) {
                    setServerError(result.error)
                }
            } catch (err) {
                setServerError(err instanceof Error ? err.message : 'server_error')
            }
        })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm">{t('auth.complete_profile.loading')}</p>
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
                    {t('auth.complete_profile.heading')}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t('auth.complete_profile.subtitle')}
                </p>
            </div>

            <div className="bg-card border-border shadow-sm rounded-2xl overflow-hidden transition-all">
                <div
                    className="h-28 transition-all duration-700"
                    style={{ background: getGradientFromColor(dominantColor) }}
                />
                <div className="px-8 pb-6">
                    <div className="relative flex justify-between items-end -mt-12 mb-4">
                        <Avatar className="w-22 h-22 border-4 border-background shadow-md bg-muted">
                            {displayUrl && (
                                <AvatarImage src={displayUrl} />
                            )}
                            <AvatarFallback className="text-2xl text-muted-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-card-foreground">
                            {fullName || t('common.full_name')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            @{username || t('common.username')}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium text-foreground/80">
                        {t('auth.complete_profile.full_name_label')}
                    </Label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="full_name"
                            name="full_name"
                            type="text"
                            placeholder={t('auth.complete_profile.full_name_placeholder')}
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
                        {t('auth.complete_profile.username_label')}
                    </Label>
                    <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            placeholder={t('auth.complete_profile.username_placeholder')}
                            autoComplete="username"
                            disabled={isPending}
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                setServerError(null)
                            }}
                            className="h-12 w-full pl-11 pr-4 text-sm bg-overlay/10 border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-brand focus-visible:ring-brand transition-all shadow-inner rounded-xl"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                        {t('auth.complete_profile.avatar_label')}
                    </Label>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            id="avatar_file"
                            name="avatar_file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={isPending}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-12 px-5 text-sm rounded-xl border-border/60 bg-overlay/10 hover:bg-overlay/20 transition-all"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {displayUrl ? t('common.change_photo') : t('common.upload_photo')}
                        </Button>
                        {displayUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isPending}
                                onClick={handleRemoveAvatar}
                                className="h-12 px-4 text-sm rounded-xl border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        {!displayUrl && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Camera className="w-4 h-4" />
                                <span>{t('auth.complete_profile.avatar_hint')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {serverError && (
                    <div
                        className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20"
                        role="alert"
                    >
                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{t(ERROR_MAP[serverError] || serverError)}</span>
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
                            <span>{t('auth.complete_profile.saving')}</span>
                        </>
                    ) : (
                        t('auth.complete_profile.go_to_dashboard')
                    )}
                </Button>
            </form>
        </div>
    )
}
