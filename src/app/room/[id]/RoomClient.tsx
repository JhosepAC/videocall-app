'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2, PhoneOff, Users, Clock, Copy, Check, Share2, X, MonitorUp, StopCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User, Hand, Sun, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'
import { useVideoEnhancer, DEFAULT_ENHANCEMENT } from '@/hooks/useVideoEnhancer'
import type { EnhancementConfig } from '@/hooks/useVideoEnhancer'
import { useWebRTC, ParticipantInfo } from '@/hooks/useWebRTC'
import { createClient } from '@/lib/supabase/client'

const MAX_GRID_PAGE_SIZE = 9

interface RoomClientProps {
    roomId: string
}

const RemoteVideo = ({ stream, info, className = '' }: { stream: MediaStream; info: ParticipantInfo; className?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const isVideoPlaying = !info.isVideoMuted

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const name = info.fullName || 'Participant'
    const username = info.username ? `@${info.username}` : ''

    return (
        <div className={`relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/40 ${className}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
            />

            {!isVideoPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm text-muted-foreground z-10 transition-all duration-300">
                    {info.avatarUrl ? (
                        <img
                            src={info.avatarUrl}
                            alt={name}
                            className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover ring-4 ring-brand/20 shadow-2xl"
                        />
                    ) : (
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center text-brand shadow-xl">
                            <User className="w-12 h-12 md:w-16 md:h-16 text-brand" />
                        </div>
                    )}
                </div>
            )}

            <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md">
                    <p className="text-xs font-semibold text-black leading-tight">{name}</p>
                    {username && (
                        <p className="text-[10px] text-black/60 leading-tight">{username}</p>
                    )}
                </div>
                {info.isHandRaised && (
                    <div className="bg-amber-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                        <Hand className="w-3 h-3" />
                    </div>
                )}
                {info.isAudioMuted && (
                    <div className="bg-red-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                        <MicOff className="w-3 h-3" />
                    </div>
                )}
            </div>
        </div>
    )
}

const SliderControl = ({ label, value, min, max, step, onChange, icon }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; icon?: React.ReactNode | string
}) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
                {typeof icon === 'string' ? <span className="text-xs">{icon}</span> : icon}
                {label}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground/70">{value > 0 ? '+' : ''}{value.toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted-foreground/20 accent-brand
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        />
    </div>
)

export default function RoomClient({ roomId }: RoomClientProps) {
    const router = useRouter()
    const {
        localStream,
        screenStream,
        status,
        errorMessage,
        isAudioMuted,
        isVideoStopped,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare
    } = useLocalMediaStream()

    const { t, locale } = useI18n()
    const screenVideoRef = useRef<HTMLVideoElement>(null)

    const [copied, setCopied] = useState(false)
    const [now, setNow] = useState(new Date())
    const [userId, setUserId] = useState('')
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    const [isHandRaised, setIsHandRaised] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isUrlCopied, setIsUrlCopied] = useState(false)
    const [isPeopleCollapsed, setIsPeopleCollapsed] = useState(false)
    const [gridPage, setGridPage] = useState(0)
    const [screenAspectRatio, setScreenAspectRatio] = useState<number | null>(null)
    const [enhanceConfig, setEnhanceConfig] = useState<EnhancementConfig>({ ...DEFAULT_ENHANCEMENT })
    const [showEnhancePanel, setShowEnhancePanel] = useState(false)

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            setUserId(user.id)
            supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setFullName(data.full_name || '')
                        setUsername(data.username || '')
                        setAvatarUrl(data.avatar_url || null)
                    }
                })
        })
    }, [])

    const screenTrack = screenStream?.getVideoTracks()[0] ?? null

    const { enhancedTrack } = useVideoEnhancer(enhanceConfig.enabled ? localStream : null, enhanceConfig)

    const { remoteStreams, remoteParticipants, endRoom, roomEnded, emitMediaState, emitHandState, replaceVideoTrack } = useWebRTC(
        roomId,
        localStream,
        screenTrack,
        { userId, fullName, username, avatarUrl, isVideoMuted: isVideoStopped, isAudioMuted, isHandRaised }
    )

    useEffect(() => {
        if (enhancedTrack && enhanceConfig.enabled) {
            replaceVideoTrack(enhancedTrack)
        } else if (!enhanceConfig.enabled && localStream) {
            const original = localStream.getVideoTracks()[0]
            if (original) {
                replaceVideoTrack(original)
            }
        }
    }, [enhancedTrack, enhanceConfig.enabled, localStream, replaceVideoTrack])

    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream
        }
        if (!screenStream) {
            setScreenAspectRatio(null)
        }

        const el = screenVideoRef.current
        if (!el) return

        const handleResize = () => {
            if (el.videoWidth && el.videoHeight) {
                setScreenAspectRatio(el.videoWidth / el.videoHeight)
            }
        }

        el.addEventListener('resize', handleResize)
        return () => el.removeEventListener('resize', handleResize)
    }, [screenStream])

    useEffect(() => {
        if (roomEnded) {
            router.push('/dashboard')
        }
    }, [roomEnded, router])

    useEffect(() => {
        const total = 1 + Object.keys(remoteParticipants).length
        const pages = Math.ceil(total / MAX_GRID_PAGE_SIZE)
        if (gridPage >= pages) {
            setGridPage(Math.max(0, pages - 1))
        }
    }, [remoteParticipants, gridPage])

    const handleToggleVideo = () => {
        const newState = toggleVideo()
        emitMediaState(newState, isAudioMuted)
    }

    const handleToggleAudio = () => {
        const newState = toggleAudio()
        emitMediaState(isVideoStopped, newState)
    }

    const handleToggleScreenShare = () => {
        if (isScreenSharing) {
            stopScreenShare(replaceVideoTrack)
        } else {
            startScreenShare(replaceVideoTrack)
        }
    }

    const handleToggleHand = () => {
        const newState = !isHandRaised
        setIsHandRaised(newState)
        emitHandState(newState)
    }

    function handleCopyRoomId() {
        navigator.clipboard.writeText(roomId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function handleCopyUrl() {
        navigator.clipboard.writeText(window.location.href)
        setIsUrlCopied(true)
        setTimeout(() => setIsUrlCopied(false), 2000)
    }

    function formatHeaderDate(d: Date): string {
        const localeStr = locale === 'es' ? 'es-ES' : 'en-US'
        return d.toLocaleDateString(localeStr, { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
    }

    function formatHeaderTime(d: Date): string {
        return d.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    if (status === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20">
                        <Loader2 className="w-10 h-10 text-brand animate-spin" />
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">{t('room.loading_devices')}</h2>
                <div className="flex gap-1.5 mt-4">
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
                <div className="flex flex-col items-center max-w-sm text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">{t('room.hardware_error')}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
                    </div>
                </div>
            </div>
        )
    }

    const totalParticipants = 1 + Object.keys(remoteParticipants).length

    const getGridDimensions = (count: number) => {
        if (count <= 1) return { cols: 1, rows: 1 }
        if (count <= 2) return { cols: 2, rows: 1 }
        if (count <= 3) return { cols: 3, rows: 1 }
        if (count <= 4) return { cols: 2, rows: 2 }
        if (count <= 6) return { cols: 3, rows: 2 }
        return { cols: 3, rows: 3 }
    }

    const allParticipants: { id: string; type: 'local' | 'remote'; stream?: MediaStream; info?: ParticipantInfo }[] = [
        { id: 'local', type: 'local' },
        ...Object.entries(remoteStreams)
            .filter(([peerId]) => remoteParticipants[peerId])
            .map(([peerId, stream]) => ({ id: peerId, type: 'remote' as const, stream, info: remoteParticipants[peerId] }))
    ]

    const totalGridPages = Math.ceil(allParticipants.length / MAX_GRID_PAGE_SIZE)
    const safeGridPage = Math.min(gridPage, Math.max(0, totalGridPages - 1))
    const startIdx = safeGridPage * MAX_GRID_PAGE_SIZE
    const pageParticipants = allParticipants.slice(startIdx, startIdx + MAX_GRID_PAGE_SIZE)
    const { cols, rows } = getGridDimensions(pageParticipants.length)

    const displayName = fullName || t('room.you')
    const displayUsername = username ? `@${username}` : ''

    const isRightPanelVisible = isScreenSharing
        ? (!isPeopleCollapsed || isSidebarOpen)
        : isSidebarOpen

    const renderPeopleThumbnails = (containerClassName = 'shrink-0', isHorizontal = false) => (
        <div className={`${containerClassName} border-t border-border/40 flex flex-col`}>
            {!isHorizontal && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {t('room.participants')} ({Object.keys(remoteParticipants).length + 1})
                    </span>
                    <button
                        onClick={() => setIsPeopleCollapsed(true)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('room.hide_people')}
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
            <div className={isHorizontal ? 'flex-1 flex items-center justify-center gap-3 px-3 overflow-hidden' : 'overflow-y-auto p-3 space-y-3'}>
                {isHorizontal ? (
                    <>
                        <div className="relative h-4/5 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80 shrink-0">
                            <video
                                autoPlay playsInline muted
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                    isVideoStopped ? 'opacity-0' : 'opacity-100'
                                } scale-x-[-1]`}
                                ref={el => { if (el && localStream) el.srcObject = localStream }}
                            />
                            {isVideoStopped && (
                                <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={displayName} className="w-18 h-18 rounded-full object-cover ring-2 ring-brand/20" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                                            <User className="w-6 h-6 text-brand" />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between z-10">
                                <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white truncate max-w-[70%]">
                                    {displayName}
                                </span>
                                <div className="flex items-center gap-1">
                                    {isHandRaised && (
                                        <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                            <Hand className="w-3 h-3" />
                                        </span>
                                    )}
                                    {isAudioMuted && (
                                        <span className="bg-red-500/80 p-0.5 rounded text-white">
                                            <MicOff className="w-3 h-3" />
                                        </span>
                                    )}
                                    {isScreenSharing && (
                                        <span className="bg-brand/80 p-0.5 rounded text-white">
                                            <MonitorUp className="w-3 h-3" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {Object.entries(remoteStreams).map(([peerId, stream]) => {
                            const info = remoteParticipants[peerId]
                            if (!info) return null
                            const remoteName = info.fullName || t('room.participant')
                            const isVideoPlaying = !info.isVideoMuted
                            return (
                                <div key={peerId} className="relative h-4/5 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80 shrink-0">
                                    <video
                                        autoPlay playsInline
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                                        ref={el => { if (el) el.srcObject = stream }}
                                    />
                                    {!isVideoPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm">
                                            {info.avatarUrl ? (
                                                <img src={info.avatarUrl} alt={remoteName} className="w-12 h-12 rounded-full object-cover ring-2 ring-brand/20" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                                                    <User className="w-6 h-6 text-brand" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between z-10">
                                        <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white truncate max-w-[70%]">
                                            {remoteName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {info.isHandRaised && (
                                                <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                                    <Hand className="w-3 h-3" />
                                                </span>
                                            )}
                                            {info.isAudioMuted && (
                                                <span className="bg-red-500/80 p-0.5 rounded text-white">
                                                    <MicOff className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <button
                            onClick={() => setIsPeopleCollapsed(true)}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card/80 hover:bg-card border border-border/40 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            {t('room.hide_people')}
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="relative w-full rounded-xl overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80">
                            <div className="relative" style={{ paddingBottom: '56.25%' }}>
                                <video
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                        isVideoStopped ? 'opacity-0' : 'opacity-100'
                                    } scale-x-[-1]`}
                                    ref={el => { if (el && localStream) el.srcObject = localStream }}
                                />
                                {isVideoStopped && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={displayName} className="w-22 h-22 rounded-full object-cover ring-2 ring-brand/20" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                                                <User className="w-5 h-5 text-brand" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                                <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[65%]">
                                    {displayName}
                                </span>
                                <div className="flex items-center gap-1">
                                    {isHandRaised && (
                                        <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                            <Hand className="w-3 h-3" />
                                        </span>
                                    )}
                                    {isAudioMuted && (
                                        <span className="bg-red-500/80 p-0.5 rounded text-white">
                                            <MicOff className="w-3 h-3" />
                                        </span>
                                    )}
                                    {isScreenSharing && (
                                        <span className="bg-brand/80 p-0.5 rounded text-white">
                                            <MonitorUp className="w-3 h-3" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {Object.entries(remoteStreams).map(([peerId, stream]) => {
                            const info = remoteParticipants[peerId]
                            if (!info) return null
                            const remoteName = info.fullName || t('room.participant')
                            const isVideoPlaying = !info.isVideoMuted
                            return (
                                <div key={peerId} className="relative w-full rounded-xl overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80">
                                    <div className="relative" style={{ paddingBottom: '56.25%' }}>
                                        <video
                                            autoPlay
                                            playsInline
                                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                                            ref={el => { if (el) el.srcObject = stream }}
                                        />
                                        {!isVideoPlaying && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm">
                                                {info.avatarUrl ? (
                                                    <img src={info.avatarUrl} alt={remoteName} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand/20" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                                                        <User className="w-5 h-5 text-brand" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                                        <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[65%]">
                                            {remoteName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {info.isHandRaised && (
                                                <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                                    <Hand className="w-3 h-3" />
                                                </span>
                                            )}
                                            {info.isAudioMuted && (
                                                <span className="bg-red-500/80 p-0.5 rounded text-white">
                                                    <MicOff className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-background">

            <header className="shrink-0 flex items-center justify-center bg-background/80 backdrop-blur-xl border-b border-border/40 h-12 z-30">
                <div className="flex items-center gap-3 px-4 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{formatHeaderDate(now)} - {formatHeaderTime(now)}</span>
                    <span className="w-px h-3 bg-border" />
                    <button
                        onClick={handleCopyRoomId}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-mono tracking-wider"
                    >
                        {roomId}
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="w-px h-3 bg-border" />
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {totalParticipants}
                    </span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 flex min-h-0">
                        <main className="flex-1 flex flex-col overflow-hidden">
                            {isScreenSharing ? (
                                <div className={`${isSidebarOpen && !isPeopleCollapsed ? 'flex-[8]' : 'flex-1'} min-h-0 flex items-center justify-center p-4`}>
                                    <div
                                        className="relative rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand/20 max-w-full max-h-full"
                                        style={screenAspectRatio ? { aspectRatio: `${screenAspectRatio}` } : undefined}
                                    >
                                        <video
                                            ref={screenVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-contain transition-opacity duration-300 opacity-100"
                                            onLoadedMetadata={(e) => {
                                                const v = e.currentTarget
                                                if (v.videoWidth && v.videoHeight) {
                                                    setScreenAspectRatio(v.videoWidth / v.videoHeight)
                                                }
                                            }}
                                        />
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                                            <div className="bg-brand/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md text-xs font-medium text-white flex items-center gap-1.5">
                                                <MonitorUp className="w-4 h-4" />
                                                {t('room.sharing_screen')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-4 overflow-hidden">
                                    <div
                                        className="w-full h-full max-w-[1600px] grid gap-3 md:gap-4 place-items-center flex-1 min-h-0"
                                        style={{
                                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                                            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                                        }}
                                    >
                                        {pageParticipants.map((p, idx) => {
                                            const centerLast = pageParticipants.length === 3 && cols === 2 && rows === 2 && idx === 2
                                            return p.type === 'local' ? (
                                                <div key="local" className={`relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand/20 ${centerLast ? 'col-span-2 justify-self-center w-1/2' : ''}`}>
                                                    <video
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                                                            isVideoStopped ? 'opacity-0' : 'opacity-100'
                                                        } scale-x-[-1]`}
                                                        ref={el => { if (el && localStream) el.srcObject = localStream }}
                                                    />

                                                    {isVideoStopped && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm text-muted-foreground z-10 transition-all duration-300">
                                                            {avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={displayName}
                                                                    className="w-32 h-32 md:w-75 md:h-75 rounded-full object-cover ring-4 ring-brand/20 shadow-2xl"
                                                                />
                                                            ) : (
                                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center text-brand shadow-xl">
                                                                    <User className="w-12 h-12 md:w-16 md:h-16 text-brand" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                                                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md">
                                                            <p className="text-xs font-semibold text-black leading-tight">{displayName}</p>
                                                            {displayUsername && (
                                                                <p className="text-[10px] text-black/60 leading-tight">{displayUsername}</p>
                                                            )}
                                                        </div>
                                                        {isHandRaised && (
                                                            <div className="bg-amber-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                                                                <Hand className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                        {isAudioMuted && (
                                                            <div className="bg-red-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                                                                <MicOff className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <RemoteVideo key={p.id} stream={p.stream!} info={p.info!} className={centerLast ? 'col-span-2 justify-self-center w-1/2' : ''} />
                                            )
                                        })}
                                    </div>
                                    {totalGridPages > 1 && (
                                        <div className="shrink-0 flex items-center justify-center gap-3 pt-2">
                                            <button
                                                onClick={() => setGridPage(p => Math.max(0, p - 1))}
                                                disabled={safeGridPage === 0}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-card/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                                {safeGridPage + 1} / {totalGridPages}
                                            </span>
                                            <button
                                                onClick={() => setGridPage(p => Math.min(totalGridPages - 1, p + 1))}
                                                disabled={safeGridPage === totalGridPages - 1}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-card/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isScreenSharing && isPeopleCollapsed && (
                                <div className="shrink-0 flex justify-center pb-3">
                                    <button
                                        onClick={() => setIsPeopleCollapsed(false)}
                                        className="flex items-center gap-2 bg-card/80 backdrop-blur-xl border border-border/40 hover:bg-card transition-all duration-200 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg hover:shadow-xl active:scale-95"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                        <Users className="w-4 h-4" />
                                        {t('room.show_people')} ({Object.keys(remoteParticipants).length + 1})
                                    </button>
                                </div>
                            )}

                            {isScreenSharing && isSidebarOpen && !isPeopleCollapsed && renderPeopleThumbnails('flex-[2] min-h-0', true)}
                        </main>

                        <div className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isRightPanelVisible ? 'w-80' : 'w-0'}`}>
                            <div className="h-full p-3">
                                <aside className="h-full bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xs flex flex-col overflow-hidden">
                                    <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'flex-1 min-h-0' : 'h-0'}`}>
                                        <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Users className="w-4 h-4 text-brand" />
                                                {t('room.participants')} ({totalParticipants})
                                            </h3>
                                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full w-8 h-8 shrink-0">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                                                <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-semibold overflow-hidden shrink-0">
                                                    {avatarUrl ? (
                                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-brand" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">
                                                        {displayName}
                                                        <span className="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded ml-1 whitespace-nowrap">{t('room.you')}</span>
                                                    </p>
                                                    {displayUsername && <p className="text-xs text-muted-foreground truncate">{displayUsername}</p>}
                                                </div>
                                                {isHandRaised && <Hand className="w-4 h-4 text-amber-500 shrink-0" />}
                                                {isAudioMuted && <MicOff className="w-4 h-4 text-red-500 shrink-0" />}
                                            </div>

                                            {Object.values(remoteParticipants).map((info) => {
                                                const remoteName = info.fullName || t('room.participant')
                                                const remoteUsername = info.username ? `@${info.username}` : ''
                                                return (
                                                    <div key={info.socketId} className="flex items-center gap-3 p-2">
                                                        <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-semibold overflow-hidden shrink-0">
                                                            {info.avatarUrl ? (
                                                                <img src={info.avatarUrl} alt={remoteName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 text-brand" />
                                                            )}
                                                        </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate">{remoteName}</p>
                                                        {remoteUsername && <p className="text-xs text-muted-foreground truncate">{remoteUsername}</p>}
                                                    </div>
                                                    {info.isHandRaised && <Hand className="w-4 h-4 text-amber-500 shrink-0" />}
                                                    {info.isAudioMuted && <MicOff className="w-4 h-4 text-red-500 shrink-0" />}
                                                </div>
                                                )
                                            })}
                                        </div>

                                        <div className="p-4 border-t border-border/40 shrink-0">
                                            <Button
                                                onClick={handleCopyUrl}
                                                className={`w-full gap-2 rounded-xl transition-all duration-300 ${isUrlCopied ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-brand hover:bg-brand/90 text-primary-foreground'}`}
                                            >
                                                {isUrlCopied ? (
                                                    <><Check className="w-4 h-4" /> {t('room.copied')}</>
                                                ) : (
                                                    <><Share2 className="w-4 h-4" /> {t('room.share_url')}</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {isScreenSharing && !isSidebarOpen && !isPeopleCollapsed && renderPeopleThumbnails()}
                                </aside>
                            </div>
                        </div>
                    </div>

                    <footer className="shrink-0 flex items-center justify-center bg-background/80 backdrop-blur-xl border-t border-border/40 h-16 relative">
                        {showEnhancePanel && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-4 w-80 z-50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-brand" />
                                        {t('room.enhance_title')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setEnhanceConfig(c => ({ ...c, enabled: !c.enabled }))}
                                            className={`relative w-9 h-5 rounded-full transition-colors ${enhanceConfig.enabled ? 'bg-brand' : 'bg-muted-foreground/30'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enhanceConfig.enabled ? 'translate-x-4' : ''}`} />
                                        </button>
                                        <Button variant="ghost" size="icon" onClick={() => setShowEnhancePanel(false)} className="rounded-full w-7 h-7">
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">{t('room.enhance_awb_auto')}</span>
                                        <button
                                            onClick={() => setEnhanceConfig(c => ({ ...c, autoWhiteBalance: !c.autoWhiteBalance }))}
                                            className={`relative w-9 h-5 rounded-full transition-colors ${enhanceConfig.autoWhiteBalance ? 'bg-brand' : 'bg-muted-foreground/30'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enhanceConfig.autoWhiteBalance ? 'translate-x-4' : ''}`} />
                                        </button>
                                    </div>
                                    <SliderControl label={t('room.enhance_wb')} value={enhanceConfig.whiteBalance} min={-1} max={1} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, whiteBalance: v }))}
                                        icon={enhanceConfig.whiteBalance > 0.05 ? '☀️' : enhanceConfig.whiteBalance < -0.05 ? '❄️' : '⚪'} />
                                    <SliderControl label={t('room.enhance_gamma')} value={enhanceConfig.gamma} min={0.5} max={2.5} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, gamma: v }))} icon="◐" />
                                    <SliderControl label={t('room.enhance_brightness')} value={enhanceConfig.brightness} min={-0.5} max={0.5} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, brightness: v }))} icon={<Sun className="w-3 h-3" />} />
                                    <SliderControl label={t('room.enhance_contrast')} value={enhanceConfig.contrast} min={0.5} max={2} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, contrast: v }))} icon="◐" />
                                    <SliderControl label={t('room.enhance_saturation')} value={enhanceConfig.saturation} min={0} max={2} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, saturation: v }))} icon="🎨" />
                                    <SliderControl label={t('room.enhance_sharpness')} value={enhanceConfig.sharpness} min={0} max={1.5} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, sharpness: v }))} icon="⬜" />
                                    <SliderControl label={t('room.enhance_denoise')} value={enhanceConfig.denoise} min={0} max={1} step={0.05}
                                        onChange={v => setEnhanceConfig(c => ({ ...c, denoise: v }))} icon="🌫️" />
                                </div>
                                <div className="mt-3 pt-2 border-t border-border/40">
                                    <button
                                        onClick={() => setEnhanceConfig({ ...DEFAULT_ENHANCEMENT, enabled: enhanceConfig.enabled })}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {t('room.enhance_reset')}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon-lg"
                                variant={isAudioMuted ? 'destructive' : 'secondary'}
                                onClick={handleToggleAudio}
                                className="rounded-xl transition-all duration-200 active:scale-90"
                            >
                                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </Button>
                            <Button
                                size="icon-lg"
                                variant={isVideoStopped ? 'destructive' : 'secondary'}
                                onClick={handleToggleVideo}
                                className="rounded-xl transition-all duration-200 active:scale-90"
                            >
                                {isVideoStopped ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={isScreenSharing ? 'default' : 'secondary'}
                                onClick={handleToggleScreenShare}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${isScreenSharing ? 'bg-brand text-primary-foreground shadow-lg shadow-brand/30' : ''}`}
                            >
                                {isScreenSharing ? <StopCircle className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={isHandRaised ? 'default' : 'secondary'}
                                onClick={handleToggleHand}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${isHandRaised ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30' : ''}`}
                            >
                                <Hand className="w-5 h-5" />
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={enhanceConfig.enabled ? 'default' : 'secondary'}
                                onClick={() => setShowEnhancePanel(v => !v)}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${enhanceConfig.enabled ? 'bg-brand text-primary-foreground shadow-lg shadow-brand/30' : ''}`}
                                title={t('room.enhance_toggle')}
                            >
                                <Palette className="w-5 h-5" />
                            </Button>

                            <span className="w-px h-8 bg-border/60 mx-1" />

                            <Button
                                size="icon-lg"
                                variant={isSidebarOpen ? 'default' : 'secondary'}
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${isSidebarOpen ? 'bg-brand text-primary-foreground' : ''}`}
                            >
                                <Users className="w-5 h-5" />
                            </Button>

                            <span className="w-px h-8 bg-border/60 mx-1" />
                            <Button
                                size="lg"
                                variant="destructive"
                                onClick={endRoom}
                                className="rounded-xl px-6 gap-2 shadow-lg shadow-destructive/20 transition-all duration-200 hover:shadow-destructive/30 active:scale-95"
                            >
                                <PhoneOff className="w-5 h-5" />
                                {t('room.leave')}
                            </Button>
                        </div>
                    </footer>
                </div>
            </div>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    )
}
