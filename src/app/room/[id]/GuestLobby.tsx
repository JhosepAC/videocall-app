'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {AlertCircle, ArrowLeft, Ban, Camera, CameraOff, Info, Loader2, Mic, MicOff, User} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useGuestRequest} from '@/hooks/useJoinRequests'
import {useDominantColor} from '@/hooks/useDominantColor'
import {getGradientFromColor} from '@/lib/utils'

const GUEST_AVATARS = [
    {id: 'avatar_1', src: '/images/guest/avatar_1.jpg', label: 'Avatar 1'},
    {id: 'avatar_2', src: '/images/guest/avatar_2.jpg', label: 'Avatar 2'},
]

interface GuestLobbyProps {
    roomId: string
    localStream: MediaStream | null
    status: string
    errorMessage: string | null
    isVideoStopped: boolean
    isAudioMuted: boolean
    toggleVideo: () => boolean
    toggleAudio: () => boolean
    onApproved: (name: string, avatar: string | null) => void
    onRejected: () => void
}

function CameraPreview({
                           localStream,
                           isVideoStopped,
                           avatarUrl,
                       }: {
    localStream: MediaStream | null
    isVideoStopped: boolean
    avatarUrl?: string | null
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [hasUserMedia, setHasUserMedia] = useState(false)

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream
            setHasUserMedia(true)
        }
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        }
    }, [localStream])

    const dominantColor = useDominantColor(!isVideoStopped && hasUserMedia ? null : null)

    return (
        <div
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-card/80 ring-1 ring-border/40 shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${
                    isVideoStopped || !hasUserMedia ? 'opacity-0' : 'opacity-100'
                }`}
            />
            {(isVideoStopped || !hasUserMedia) && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300"
                    style={{background: getGradientFromColor(dominantColor)}}
                >
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-20 h-20 rounded-full object-cover ring-2 ring-white/20 shadow-xl"
                        />
                    ) : (
                        <div
                            className="w-20 h-20 rounded-full bg-black/10 dark:bg-white/10 border-2 border-black/20 dark:border-white/20 flex items-center justify-center shadow-xl">
                            <User className="w-10 h-10 text-foreground/60"/>
                        </div>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground">Camera is off</p>
                </div>
            )}
        </div>
    )
}

export default function GuestLobby({
                                       roomId,
                                       localStream,
                                       status: mediaStatus,
                                       errorMessage,
                                       isVideoStopped,
                                       isAudioMuted,
                                       toggleVideo,
                                       toggleAudio,
                                       onApproved,
                                       onRejected,
                                   }: GuestLobbyProps) {
    const {t} = useI18n()
    const [guestName, setGuestName] = useState('')
    const [nameError, setNameError] = useState('')
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
    const [isSending, setIsSending] = useState(false)

    const {status: requestStatus, error: requestError, sendRequest, cancelRequest} = useGuestRequest(roomId, guestName)

    useEffect(() => {
        if (requestStatus === 'approved') {
            onApproved(guestName, selectedAvatar)
        }
    }, [requestStatus, onApproved, guestName, selectedAvatar])

    const handleRequestJoin = async () => {
        const trimmed = guestName.trim()
        if (!trimmed) {
            setNameError(t('room.guest_name_required'))
            return
        }
        if (trimmed.length < 2) {
            setNameError(t('room.guest_name_min'))
            return
        }
        setNameError('')
        setIsSending(true)
        await sendRequest()
    }

    const handleCancel = async () => {
        await cancelRequest()
        setIsSending(false)
    }

    const handleGoBack = () => {
        setIsSending(false)
    }

    const showPending = isSending || requestStatus === 'pending'
    const showRejected = requestStatus === 'rejected'

    if (showPending) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="flex flex-col items-center max-w-sm text-center space-y-6">
                    <div className="relative mb-4">
                        <div
                            className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <Loader2 className="w-10 h-10 text-amber-500 animate-spin"/>
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold">{t('room.guest_pending_title')}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('room.guest_pending_desc')}
                    </p>
                    <div className="flex items-center gap-2 px-4 py-2 bg-card/60 rounded-lg border border-border/40">
                        <User className="w-4 h-4 text-muted-foreground"/>
                        <span className="text-sm font-medium">{guestName}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500/40 animate-bounce"
                              style={{animationDelay: '0ms'}}/>
                        <span className="w-2 h-2 rounded-full bg-amber-500/40 animate-bounce"
                              style={{animationDelay: '150ms'}}/>
                        <span className="w-2 h-2 rounded-full bg-amber-500/40 animate-bounce"
                              style={{animationDelay: '300ms'}}/>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="mt-4 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1"/>
                        {t('room.guest_cancel')}
                    </Button>
                </div>
            </div>
        )
    }

    if (showRejected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="flex flex-col items-center max-w-sm text-center space-y-6">
                    <div
                        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                        <Ban className="w-8 h-8 text-destructive"/>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">{t('room.guest_rejected_title')}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('room.guest_rejected_desc')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleGoBack}
                        className="mt-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1"/>
                        {t('room.guest_try_again')}
                    </Button>
                </div>
            </div>
        )
    }

    if (mediaStatus === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="relative mb-8">
                    <div
                        className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20">
                        <Loader2 className="w-10 h-10 text-brand animate-spin"/>
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">{t('room.loading_devices')}</h2>
                <div className="flex gap-1.5 mt-4">
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{animationDelay: '0ms'}}/>
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce"
                          style={{animationDelay: '150ms'}}/>
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce"
                          style={{animationDelay: '300ms'}}/>
                </div>
            </div>
        )
    }

    if (mediaStatus === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="flex flex-col items-center max-w-sm text-center space-y-6">
                    <div
                        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                        <AlertCircle className="w-8 h-8 text-destructive"/>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">{t('room.hardware_error')}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{t('room.guest_join_title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('room.guest_join_subtitle')}</p>
                </div>

                <div
                    className="bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-2xl p-5 space-y-3">
                    <div className="text-center space-y-1">
                        <h2 className="text-lg font-semibold text-foreground">{t('room.guest_login_title')}</h2>
                        <p className="text-xs text-muted-foreground">{t('room.guest_login_desc')}</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/login"
                            className="flex-1 h-10 inline-flex shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-background text-xs font-medium text-foreground hover:bg-brand/10 hover:border-brand/50 transition-all select-none cursor-pointer"
                        >
                            {t('room.guest_sign_in')}
                        </Link>
                        <Link
                            href="/register"
                            className="flex-1 h-10 inline-flex shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-medium text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all select-none cursor-pointer"
                        >
                            {t('room.guest_create_account')}
                        </Link>
                    </div>
                </div>

                <CameraPreview localStream={localStream} isVideoStopped={isVideoStopped} avatarUrl={selectedAvatar}/>

                <div className="flex items-center justify-center gap-3">
                    <Button
                        size="icon-lg"
                        variant={isAudioMuted ? 'destructive' : 'secondary'}
                        onClick={toggleAudio}
                        className="rounded-xl transition-all duration-200 active:scale-90"
                        title={isAudioMuted ? t('room.unmute') : t('room.mute')}
                    >
                        {isAudioMuted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                    </Button>
                    <Button
                        size="icon-lg"
                        variant={isVideoStopped ? 'destructive' : 'secondary'}
                        onClick={toggleVideo}
                        className="rounded-xl transition-all duration-200 active:scale-90"
                        title={isVideoStopped ? t('room.turn_on_camera') : t('room.turn_off_camera')}
                    >
                        {isVideoStopped ? <CameraOff className="w-5 h-5"/> : <Camera className="w-5 h-5"/>}
                    </Button>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('room.guest_name_label')}</label>
                    <Input
                        value={guestName}
                        onChange={(e) => {
                            setGuestName(e.target.value);
                            setNameError('')
                        }}
                        placeholder={t('room.guest_name_placeholder')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRequestJoin()
                        }}
                        className="h-10 text-sm"
                    />
                    {nameError && (
                        <p className="text-xs text-destructive">{nameError}</p>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs font-medium text-muted-foreground">{t('room.guest_avatar_label')}</span>
                        <div className="relative group">
                            <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help"/>
                            <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-popover text-popover-foreground text-[11px] shadow-lg border border-border/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 text-center whitespace-normal">
                                {t('room.guest_avatar_info')}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {GUEST_AVATARS.map((avatar) => (
                            <button
                                key={avatar.id}
                                type="button"
                                onClick={() => setSelectedAvatar(selectedAvatar === avatar.src ? null : avatar.src)}
                                className={`relative w-full aspect-square max-w-[120px] rounded-xl overflow-hidden ring-2 transition-all duration-200 ${
                                    selectedAvatar === avatar.src
                                        ? 'ring-brand ring-offset-2 ring-offset-background scale-105'
                                        : 'ring-border/40 hover:ring-border/80 hover:scale-[1.02]'
                                }`}
                            >
                                <img
                                    src={avatar.src}
                                    alt={avatar.label}
                                    className="w-full h-full object-cover"
                                />
                                {selectedAvatar === avatar.src && (
                                    <div className="absolute inset-0 bg-brand/10 flex items-center justify-center">
                                        <div
                                            className="w-6 h-6 rounded-full bg-brand/90 text-white flex items-center justify-center shadow-lg">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                                                 strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {requestError && (
                    <div
                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0"/>
                        <p className="text-xs text-destructive">{requestError}</p>
                    </div>
                )}

                <Button
                    onClick={handleRequestJoin}
                    disabled={!guestName.trim()}
                    className="w-full h-11 rounded-xl text-sm font-medium"
                >
                    {t('room.guest_request_join')}
                </Button>
            </div>
        </div>
    )
}
