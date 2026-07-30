'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {
    AlertCircle,
    Camera,
    CameraOff,
    Cast,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Contrast,
    Copy,
    Droplets,
    Hand,
    Loader2,
    Mic,
    MicOff,
    MonitorUp,
    Palette,
    PhoneOff,
    Pin,
    RotateCcw,
    Share2,
    ShieldAlert,
    SlidersHorizontal,
    SmilePlus,
    Sparkles,
    StopCircle,
    Sun,
    Thermometer,
    User,
    Users,
    X
} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useLocalMediaStream} from '@/hooks/useLocalMediaStream'
import type {EnhancementConfig} from '@/hooks/useVideoEnhancer'
import {DEFAULT_ENHANCEMENT, useVideoEnhancer} from '@/hooks/useVideoEnhancer'
import {ParticipantInfo, useWebRTC} from '@/hooks/useWebRTC'
import {createClient} from '@/lib/supabase/client'
import {EMOJI_LIST, getEmojiUrl} from '@/lib/emojis'
import {useDominantColor} from '@/hooks/useDominantColor'
import {getGradientFromColor} from '@/lib/utils'
import {useHostRequests} from '@/hooks/useJoinRequests'
import GuestLobby from './GuestLobby'

const MAX_GRID_PAGE_SIZE = 9

interface RoomClientProps {
    roomId: string
}

const RemoteVideo = ({stream, info, className = ''}: {
    stream: MediaStream;
    info: ParticipantInfo;
    className?: string
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const isVideoPlaying = !info.isVideoMuted

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const name = info.fullName || 'Participant'
    const username = info.username ? `@${info.username}` : ''
    const dominantColor = useDominantColor(info.avatarUrl || null)

    return (
        <div
            className={`relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/40 ${className}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
            />

            {!isVideoPlaying && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm text-muted-foreground transition-all duration-300"
                    style={{background: getGradientFromColor(dominantColor)}}>
                    {info.avatarUrl ? (
                        <img
                            src={info.avatarUrl}
                            alt={name}
                            className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
                        />
                    ) : (
                        <div
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/10 dark:bg-white/10 border-2 border-black/20 dark:border-white/20 flex items-center justify-center text-foreground/60 shadow-xl">
                            <User className="w-12 h-12 md:w-16 md:h-16 text-foreground/60"/>
                        </div>
                    )}
                </div>
            )}

            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md">
                    <p className="text-xs font-semibold text-black leading-tight">{name}</p>
                    {username && (
                        <p className="text-[10px] text-black/60 leading-tight">{username}</p>
                    )}
                </div>
                {info.isHandRaised && (
                    <div className="bg-amber-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                        <Hand className="w-3 h-3"/>
                    </div>
                )}
                {info.isAudioMuted && (
                    <div className="bg-red-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                        <MicOff className="w-3 h-3"/>
                    </div>
                )}
            </div>
        </div>
    )
}

const ScreenShareTile = ({ stream, participantName, isPinned, onTogglePin, canPin }: {
    stream: MediaStream | null;
    participantName: string;
    isPinned: boolean;
    onTogglePin?: () => void;
    canPin?: boolean;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative w-full h-full min-h-0 min-w-0 flex items-center justify-center overflow-hidden group">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
            />

            {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black rounded-2xl backdrop-blur-sm">
                    <div className="relative">
                        <div
                            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                            <Cast className="w-6 h-6 text-white/70"/>
                        </div>
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                            <Loader2 className="w-2.5 h-2.5 text-white animate-spin"/>
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-5">
                        <span className="text-sm font-medium text-white/90">Connecting presentation</span>
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                                  style={{animationDelay: '0ms'}}/>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                                  style={{animationDelay: '150ms'}}/>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                                  style={{animationDelay: '300ms'}}/>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating controls */}
            {canPin && onTogglePin && (
                <button
                    onClick={onTogglePin}
                    aria-label={isPinned ? `Unpin ${participantName}'s screen` : `Pin ${participantName}'s screen`}
                    className={`absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center backdrop-blur-md rounded-xl text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                        isPinned
                            ? 'bg-brand/90 hover:bg-brand shadow-lg shadow-brand/30'
                            : 'bg-black/60 hover:bg-white/20'
                    }`}
                    title={isPinned ? 'Unpin' : 'Pin'}
                >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`}/>
                </button>
            )}
        </div>
    )
}

const ThumbnailFallback = ({avatarUrl, name, imgSize, iconSize, iconCircleSize}: {
    avatarUrl?: string | null;
    name: string;
    imgSize: string;
    iconSize: string;
    iconCircleSize: string
}) => {
    const dominantColor = useDominantColor(avatarUrl || null)
    return (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-all duration-300"
             style={{background: getGradientFromColor(dominantColor)}}>
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    className={`${imgSize} rounded-full object-cover ring-2 ring-white/20 shadow-2xl`}
                />
            ) : (
                <div
                    className={`${iconCircleSize} rounded-full bg-black/10 dark:bg-white/10 border-2 border-black/20 dark:border-white/20 flex items-center justify-center text-foreground/60 shadow-xl`}>
                    <User className={`${iconSize} text-foreground/60`}/>
                </div>
            )}
        </div>
    )
}

const SliderControl = ({label, value, min, max, step, onChange, icon}: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; icon?: React.ReactNode | string
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm text-foreground/65">
                    {typeof icon === 'string' ? <span className="text-xs">{icon}</span> : icon}
                    {label}
                </span>
                <span className="text-xs font-mono tabular-nums text-foreground/40 min-w-[3.5rem] text-right">
                    {value > 0 ? '+' : ''}{value.toFixed(2)}
                </span>
            </div>
            <div className="relative h-1.5">
                <div className="absolute inset-0 rounded-full bg-muted-foreground/15"/>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full appearance-none cursor-pointer bg-transparent
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground/50
                        [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150
                        [&::-webkit-slider-thumb]:hover:bg-foreground/70 [&::-webkit-slider-thumb]:active:bg-foreground/90
                        [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
                        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground/50"
                />
            </div>
        </div>
    )
}

export default function RoomClient({roomId}: RoomClientProps) {
    const router = useRouter()
    const {
        localStream,
        screenStream,
        status,
        errorMessage,
        isAudioMuted: localIsAudioMuted,
        isVideoStopped: localIsVideoStopped,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare
    } = useLocalMediaStream()

    const {t, locale} = useI18n()

    const [copied, setCopied] = useState(false)
    const [now, setNow] = useState(new Date())
    const [userId, setUserId] = useState('')
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    const [localIsHandRaised, setLocalIsHandRaised] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isUrlCopied, setIsUrlCopied] = useState(false)
    const [isPeopleCollapsed, setIsPeopleCollapsed] = useState(false)
    const [gridPage, setGridPage] = useState(0)
    const [enhanceConfig, setEnhanceConfig] = useState<EnhancementConfig>({...DEFAULT_ENHANCEMENT})
    const [showEnhancePanel, setShowEnhancePanel] = useState(false)
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)
    const screenShareRequestRef = useRef(false)

    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [profileLoaded, setProfileLoaded] = useState(false)
    const [guestState, setGuestState] = useState<'idle' | 'approved'>('idle')
    const [guestName, setGuestName] = useState('')
    const [guestAvatar, setGuestAvatar] = useState<string | null>(null)
    const [guestUserId] = useState(() => `guest-${crypto.randomUUID()}`)
    const [pinnedShareId, setPinnedShareId] = useState<string | null>(null)

    const localStreamRef = useRef<MediaStream | null>(null)
    const participantCountRef = useRef(1)

    const {requests, approveRequest, rejectRequest} = useHostRequests(
        isAuthenticated === true ? roomId : null
    )

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        if (!showReactionPicker) return
        const handleClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowReactionPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [showReactionPicker])

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({data: {user}}) => {
            if (user) {
                setIsAuthenticated(true)
                setUserId(user.id)
                supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url')
                    .eq('id', user.id)
                    .single()
                    .then(({data}) => {
                        if (data) {
                            setFullName(data.full_name || '')
                            setUsername(data.username || '')
                            setAvatarUrl(data.avatar_url || null)
                        }
                        setProfileLoaded(true)
                    }, () => setProfileLoaded(true))
            } else {
                setIsAuthenticated(false)
                setProfileLoaded(true)
            }
        })
    }, [])

    useEffect(() => {
        let keepAliveInterval: ReturnType<typeof setInterval> | undefined

        const handleVisibility = () => {
            const stream = localStreamRef.current
            const videoTrack = stream?.getVideoTracks()[0]
            const count = participantCountRef.current

            if (document.hidden) {
                if (count <= 1 && videoTrack?.enabled) {
                    videoTrack.enabled = false
                } else if (count >= 2) {
                    keepAliveInterval = setInterval(() => {
                        navigator.mediaDevices.enumerateDevices().catch(() => {
                        })
                    }, 1_000)
                }
            } else {
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval)
                    keepAliveInterval = undefined
                }
                if (videoTrack && !videoTrack.enabled) {
                    videoTrack.enabled = true
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            if (keepAliveInterval) clearInterval(keepAliveInterval)
        }
    }, [])

    const screenTrack = screenStream?.getVideoTracks()[0] ?? null

    const {enhancedTrack} = useVideoEnhancer(enhanceConfig.enabled ? localStream : null, enhanceConfig)

    const localDisplayStream = useMemo(() => {
        if (!localStream) return null
        if (enhancedTrack && enhanceConfig.enabled) {
            const tracks = [enhancedTrack, ...localStream.getAudioTracks()]
            return new MediaStream(tracks)
        }
        return localStream
    }, [localStream, enhancedTrack, enhanceConfig.enabled])

    const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
        if (el && localDisplayStream) {
            el.srcObject = localDisplayStream
        }
    }, [localDisplayStream])

    const isGuestMode = isAuthenticated === false && guestState === 'approved'

    const localAvatarUrl = isGuestMode ? guestAvatar : avatarUrl

    const userInfo = useMemo(() => ({
        userId: isGuestMode ? guestUserId : userId,
        fullName: isGuestMode ? guestName : (fullName || ''),
        username: isGuestMode ? '' : username,
        avatarUrl: isGuestMode ? guestAvatar : avatarUrl,
        isVideoMuted: localIsVideoStopped, isAudioMuted: localIsAudioMuted,
        isEnhanced: enhanceConfig.enabled,
    }), [userId, fullName, username, avatarUrl, localIsVideoStopped, localIsAudioMuted, isGuestMode, guestName, guestUserId, guestAvatar, enhanceConfig.enabled])

    const shouldConnect = (isAuthenticated === true && profileLoaded) || (isAuthenticated === false && guestState === 'approved')

    const {
        remoteStreams,
        remoteScreenStreams,
        remoteParticipants,
        remoteReactions,
        localParticipant,
        activeScreenShareIds,
        endRoom,
        leaveRoom,
        roomEnded,
        emitMediaState,
        emitHandState,
        emitEnhancementState,
        emitScreenShareState,
        emitReaction,
        replaceVideoTrack,
        addScreenTrack,
        removeScreenTrack,
    } = useWebRTC(
        roomId,
        shouldConnect ? localStream : null,
        screenTrack,
        userInfo,
        localIsHandRaised,
        shouldConnect
    )

    useEffect(() => {
        localStreamRef.current = localStream
        participantCountRef.current = 1 + Object.keys(remoteParticipants).length
    })

    // Shared presentation state always comes from the server snapshot.  Local
    // tracks change immediately, but the UI reconciles to this state as soon
    // as the authoritative acknowledgement arrives.
    const isAudioMuted = localParticipant?.isAudioMuted ?? localIsAudioMuted
    const isVideoStopped = localParticipant?.isVideoMuted ?? localIsVideoStopped
    const isHandRaised = localParticipant?.isHandRaised ?? localIsHandRaised

    useEffect(() => {
        const outgoingTrack = enhanceConfig.enabled ? enhancedTrack : localStream?.getVideoTracks()[0]
        if (outgoingTrack) replaceVideoTrack(outgoingTrack)
    }, [enhancedTrack, enhanceConfig.enabled, localStream, replaceVideoTrack])

    useEffect(() => {
        emitEnhancementState(enhanceConfig.enabled)
    }, [enhanceConfig.enabled, emitEnhancementState])

    const screenShareParticipants = useMemo(() => {
        const result: { participant: ParticipantInfo; stream: MediaStream | null }[] = []
        for (const pid of activeScreenShareIds) {
            const p = Object.values(remoteParticipants).find(rp => rp.participantId === pid) ||
                (localParticipant?.participantId === pid ? localParticipant : null)
            if (!p) continue
            const stream = p.participantId === localParticipant?.participantId
                ? screenStream
                : remoteScreenStreams[p.socketId] ?? null
            result.push({participant: p, stream})
        }
        return result
    }, [remoteParticipants, activeScreenShareIds, localParticipant, screenStream, remoteScreenStreams])

    const isRoomScreenSharing = activeScreenShareIds.length > 0

    // A pinned presentation is promoted to the first main slot.  The second
    // slot is filled by the next active share, so two shares are always visible
    // together and a selected share never disappears from the primary area.
    const activePinnedShareId = pinnedShareId && activeScreenShareIds.includes(pinnedShareId)
        ? pinnedShareId
        : null

    const mainScreenShares = useMemo(() => {
        const ordered = activePinnedShareId
            ? [
                ...screenShareParticipants.filter(item => item.participant.participantId === activePinnedShareId),
                ...screenShareParticipants.filter(item => item.participant.participantId !== activePinnedShareId),
            ]
            : screenShareParticipants
        return ordered.slice(0, 2)
    }, [screenShareParticipants, activePinnedShareId])

    const additionalScreenShares = useMemo(() => {
        const visibleIds = new Set(mainScreenShares.map(item => item.participant.participantId))
        return screenShareParticipants.filter(item => !visibleIds.has(item.participant.participantId))
    }, [screenShareParticipants, mainScreenShares])

    useEffect(() => {
        if (pinnedShareId && !activePinnedShareId) setPinnedShareId(null)
    }, [pinnedShareId, activePinnedShareId])

    useEffect(() => {
        if (localParticipant?.isScreenSharing) screenShareRequestRef.current = false
    }, [localParticipant?.isScreenSharing])

    // Stop local screen share if the server no longer lists us as sharing
    useEffect(() => {
        if (!isScreenSharing || screenShareRequestRef.current ||
            activeScreenShareIds.includes(localParticipant?.participantId ?? '')) return
        stopScreenShare()
        removeScreenTrack()
    }, [isScreenSharing, activeScreenShareIds, localParticipant?.participantId, stopScreenShare, removeScreenTrack])

    useEffect(() => {
        if (roomEnded) {
            router.push('/dashboard')
        }
    }, [roomEnded, router])

    const handleToggleVideo = () => {
        const newState = toggleVideo()
        emitMediaState(newState, isAudioMuted)
    }

    const handleToggleAudio = () => {
        const newState = toggleAudio()
        emitMediaState(isVideoStopped, newState)
    }

    const handleToggleScreenShare = async () => {
        if (isScreenSharing) {
            screenShareRequestRef.current = false
            stopScreenShare()
            removeScreenTrack()
            emitScreenShareState(false)
        } else {
            screenShareRequestRef.current = true
            const screenTrack = await startScreenShare(() => {
                screenShareRequestRef.current = false
                removeScreenTrack()
                emitScreenShareState(false)
            })
            if (screenTrack) {
                addScreenTrack(screenTrack)
                emitScreenShareState(true)
            } else {
                screenShareRequestRef.current = false
            }
        }
    }

    const handAudioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        handAudioRef.current = new Audio('/sounds/raise-hand.mp3')
    }, [])

    const handleToggleHand = () => {
        const newState = !isHandRaised
        setLocalIsHandRaised(newState)
        emitHandState(newState)
        if (newState && handAudioRef.current) {
            handAudioRef.current.currentTime = 0
            handAudioRef.current.play().catch(() => {
            })
        }
    }

    const handleReact = (emoji: string) => {
        emitReaction(emoji)
    }

    const handleLeaveRoom = () => {
        if (localParticipant?.isHost) endRoom()
        else leaveRoom()
        router.push('/dashboard')
    }

    const allReactions = remoteReactions

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
        return d.toLocaleDateString(localeStr, {weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric'})
    }

    function formatHeaderTime(d: Date): string {
        return d.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    if (isAuthenticated === null) {
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

    if (isAuthenticated === false && guestState === 'idle') {
        return (
            <GuestLobby
                roomId={roomId}
                localStream={localStream}
                status={status}
                errorMessage={errorMessage}
                isVideoStopped={isVideoStopped}
                isAudioMuted={isAudioMuted}
                toggleVideo={toggleVideo}
                toggleAudio={toggleAudio}
                onApproved={(name, avatar) => {
                    setGuestName(name)
                    setGuestAvatar(avatar)
                    setGuestState('approved')
                }}
                onRejected={() => {
                    setGuestState('idle')
                }}
            />
        )
    }

    if (status === 'requesting') {
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

    if (status === 'error') {
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

    const totalParticipants = 1 + Object.keys(remoteParticipants).length

    const getGridDimensions = (count: number) => {
        if (count <= 1) return {cols: 1, rows: 1}
        if (count <= 2) return {cols: 2, rows: 1}
        if (count <= 3) return {cols: 3, rows: 1}
        if (count <= 4) return {cols: 2, rows: 2}
        if (count <= 6) return {cols: 3, rows: 2}
        return {cols: 3, rows: 3}
    }

    const allParticipants: { id: string; type: 'local' | 'remote'; stream?: MediaStream; info?: ParticipantInfo }[] = [
        {id: 'local', type: 'local'},
        ...Object.entries(remoteStreams)
            .filter(([peerId]) => remoteParticipants[peerId])
            .map(([peerId, stream]) => ({
                id: peerId,
                type: 'remote' as const,
                stream,
                info: remoteParticipants[peerId]
            }))
    ]

    const totalGridPages = Math.ceil(allParticipants.length / MAX_GRID_PAGE_SIZE)
    const safeGridPage = Math.min(gridPage, Math.max(0, totalGridPages - 1))
    const startIdx = safeGridPage * MAX_GRID_PAGE_SIZE
    const pageParticipants = allParticipants.slice(startIdx, startIdx + MAX_GRID_PAGE_SIZE)
    const {cols, rows} = getGridDimensions(pageParticipants.length)

    const displayName = isGuestMode ? guestName : (fullName || t('room.you'))
    const displayUsername = isGuestMode ? '' : (username ? `@${username}` : '')

    const isRightPanelVisible = isRoomScreenSharing
        ? (!isPeopleCollapsed || isSidebarOpen || showEnhancePanel)
        : (isSidebarOpen || showEnhancePanel)

    const renderPeopleThumbnails = (containerClassName = 'shrink-0', isHorizontal = false) => (
        <div className={`${containerClassName} border-t border-border/40 flex flex-col`}>
            {!isHorizontal && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5"/>
                        {t('room.participants')} ({Object.keys(remoteParticipants).length + 1})
                    </span>
                    <button
                        onClick={() => setIsPeopleCollapsed(true)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('room.hide_people')}
                        <ChevronDown className="w-3.5 h-3.5"/>
                    </button>
                </div>
            )}
            <div
                className={isHorizontal ? 'flex-1 flex items-center justify-center gap-3 px-3 overflow-hidden' : 'overflow-y-auto p-3 space-y-3'}>
                {isHorizontal ? (
                    <>
                        <div
                            className="relative h-4/5 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80 shrink-0">
                            <video
                                autoPlay playsInline muted
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                    isVideoStopped ? 'opacity-0' : 'opacity-100'
                                } scale-x-[-1]`}
                                ref={setLocalVideoRef}
                            />
                            {isVideoStopped && (
                                <ThumbnailFallback avatarUrl={localAvatarUrl} name={displayName} imgSize="w-18 h-18"
                                                   iconSize="w-6 h-6" iconCircleSize="w-12 h-12"/>
                            )}
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between z-10">
                                <span
                                    className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white truncate max-w-[70%]">
                                    {displayName}
                                </span>
                                <div className="flex items-center gap-1">
                                    {isHandRaised && (
                                        <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                            <Hand className="w-3 h-3"/>
                                        </span>
                                    )}
                                    {isAudioMuted && (
                                        <span className="bg-red-500/80 p-0.5 rounded text-white">
                                            <MicOff className="w-3 h-3"/>
                                        </span>
                                    )}
                                    {isScreenSharing && (
                                        <span className="bg-brand/80 p-0.5 rounded text-white">
                                            <MonitorUp className="w-3 h-3"/>
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
                                <div key={peerId}
                                     className="relative h-4/5 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80 shrink-0">
                                    <video
                                        autoPlay playsInline
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                                        ref={el => {
                                            if (el) el.srcObject = stream
                                        }}
                                    />
                                    {!isVideoPlaying && (
                                        <ThumbnailFallback avatarUrl={info.avatarUrl} name={remoteName}
                                                           imgSize="w-12 h-12" iconSize="w-6 h-6"
                                                           iconCircleSize="w-12 h-12"/>
                                    )}
                                    <div
                                        className="absolute bottom-1 left-1 right-1 flex items-center justify-between z-10">
                                        <span
                                            className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white truncate max-w-[70%]">
                                            {remoteName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {info.isHandRaised && (
                                                <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                                    <Hand className="w-3 h-3"/>
                                                </span>
                                            )}
                                            {info.isAudioMuted && (
                                                <span className="bg-red-500/80 p-0.5 rounded text-white">
                                                    <MicOff className="w-3 h-3"/>
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
                            <ChevronDown className="w-3.5 h-3.5"/>
                        </button>
                    </>
                ) : (
                    <>
                        <div
                            className="relative w-full rounded-xl overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80">
                            <div className="relative" style={{paddingBottom: '56.25%'}}>
                                <video
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                        isVideoStopped ? 'opacity-0' : 'opacity-100'
                                    } scale-x-[-1]`}
                                    ref={setLocalVideoRef}
                                />
                                {isVideoStopped && (
                                    <ThumbnailFallback avatarUrl={localAvatarUrl} name={displayName} imgSize="w-22 h-22"
                                                       iconSize="w-5 h-5" iconCircleSize="w-10 h-10"/>
                                )}
                            </div>
                            <div
                                className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                                <span
                                    className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[65%]">
                                    {displayName}
                                </span>
                                <div className="flex items-center gap-1">
                                    {isHandRaised && (
                                        <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                            <Hand className="w-3 h-3"/>
                                        </span>
                                    )}
                                    {isAudioMuted && (
                                        <span className="bg-red-500/80 p-0.5 rounded text-white">
                                            <MicOff className="w-3 h-3"/>
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
                                <div key={peerId}
                                     className="relative w-full rounded-xl overflow-hidden shadow-md ring-1 ring-border/40 bg-card/80">
                                    <div className="relative" style={{paddingBottom: '56.25%'}}>
                                        <video
                                            autoPlay
                                            playsInline
                                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                                            ref={el => {
                                                if (el) el.srcObject = stream
                                            }}
                                        />
                                        {!isVideoPlaying && (
                                            <ThumbnailFallback avatarUrl={info.avatarUrl} name={remoteName}
                                                               imgSize="w-10 h-10" iconSize="w-5 h-5"
                                                               iconCircleSize="w-10 h-10"/>
                                        )}
                                    </div>
                                    <div
                                        className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                                        <span
                                            className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[65%]">
                                            {remoteName}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {info.isHandRaised && (
                                                <span className="bg-amber-500/80 p-0.5 rounded text-white">
                                                    <Hand className="w-3 h-3"/>
                                                </span>
                                            )}
                                            {info.isAudioMuted && (
                                                <span className="bg-red-500/80 p-0.5 rounded text-white">
                                                    <MicOff className="w-3 h-3"/>
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

            <header
                className="shrink-0 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border/40 h-12 z-30 px-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5"/>
                    <span className="tabular-nums">{formatHeaderDate(now)} - {formatHeaderTime(now)}</span>
                    <span className="w-px h-3 bg-border"/>
                    <button
                        onClick={handleCopyRoomId}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-mono tracking-wider"
                    >
                        {roomId}
                        {copied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                    </button>
                    <span className="w-px h-3 bg-border"/>
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5"/>
                        {totalParticipants}
                    </span>
                </div>
                {isRoomScreenSharing && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MonitorUp className="w-3.5 h-3.5 text-brand"/>
                        <span>
                            {screenShareParticipants.map(p => p.participant.fullName || t('room.participant')).join(', ')} · {t('room.sharing_screen')}
                        </span>
                    </div>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 flex min-h-0">
                        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                            {isRoomScreenSharing ? (
                                <div className="flex-1 min-h-0 min-w-0 flex flex-col p-3 gap-3 overflow-hidden">
                                    {mainScreenShares.length > 0 && (
                                        <div
                                            className={`flex-1 min-h-0 min-w-0 grid gap-3 ${
                                                mainScreenShares.length === 2
                                                    ? 'grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1'
                                                    : 'grid-cols-1 grid-rows-1'
                                            }`}
                                        >
                                            {mainScreenShares.map(({participant, stream}) => (
                                                <ScreenShareTile
                                                    key={participant.participantId}
                                                    stream={stream}
                                                    participantName={participant.fullName || t('room.participant')}
                                                    isPinned={activePinnedShareId === participant.participantId}
                                                    onTogglePin={() => setPinnedShareId(current => current === participant.participantId ? null : participant.participantId)}
                                                    canPin={screenShareParticipants.length > 1}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Bottom thumbnails for additional shared screens */}
                                    {additionalScreenShares.length > 0 && (
                                        <div className="shrink-0 flex gap-2 overflow-x-auto pb-1 px-1" aria-label="Other shared screens">
                                            {additionalScreenShares.map(({participant, stream}) => {
                                                const isPinned = activePinnedShareId === participant.participantId
                                                return (
                                                    <button
                                                        type="button"
                                                        key={participant.participantId}
                                                        className="relative h-20 aspect-video shrink-0 rounded-xl overflow-hidden cursor-pointer ring-1 ring-white/10 transition-all duration-200 hover:ring-brand/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand group"
                                                        onClick={() => setPinnedShareId(current => current === participant.participantId ? null : participant.participantId)}
                                                        aria-label={`Pin ${participant.fullName || t('room.participant')}'s screen`}
                                                        title="Pin"
                                                    >
                                                        <video
                                                            autoPlay playsInline muted
                                                            className="w-full h-full object-contain"
                                                            ref={el => {
                                                                if (el) el.srcObject = stream
                                                            }}
                                                        />
                                                        {isPinned && (
                                                            <div className="absolute top-1 right-1 bg-brand/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                                                PIN
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="flex-1 flex flex-col items-center justify-center p-3 md:p-4 overflow-hidden">
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
                                                <div key="local"
                                                     className={`relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand/20 ${centerLast ? 'col-span-2 justify-self-center w-1/2' : ''}`}>
                                                    <video
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                                                            isVideoStopped ? 'opacity-0' : 'opacity-100'
                                                        } scale-x-[-1]`}
                                                        ref={setLocalVideoRef}
                                                    />

                                                    {isVideoStopped && (
                                                        <ThumbnailFallback avatarUrl={localAvatarUrl} name={displayName}
                                                                           imgSize="w-32 h-32 md:w-75 md:h-75"
                                                                           iconSize="w-12 h-12 md:w-16 md:h-16"
                                                                           iconCircleSize="w-24 h-24 md:w-32 md:h-32"/>
                                                    )}

                                                    <div
                                                        className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                                                        <div
                                                            className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md">
                                                            <p className="text-xs font-semibold text-black leading-tight">{displayName}</p>
                                                            {displayUsername && (
                                                                <p className="text-[10px] text-black/60 leading-tight">{displayUsername}</p>
                                                            )}
                                                        </div>
                                                        {isHandRaised && (
                                                            <div
                                                                className="bg-amber-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                                                                <Hand className="w-3 h-3"/>
                                                            </div>
                                                        )}
                                                        {isAudioMuted && (
                                                            <div
                                                                className="bg-red-500/90 backdrop-blur-md p-1.5 rounded-full shadow-md text-white">
                                                                <MicOff className="w-3 h-3"/>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <RemoteVideo key={p.id} stream={p.stream!} info={p.info!}
                                                             className={centerLast ? 'col-span-2 justify-self-center w-1/2' : ''}/>
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
                                                <ChevronLeft className="w-4 h-4"/>
                                            </button>
                                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                                {safeGridPage + 1} / {totalGridPages}
                                            </span>
                                            <button
                                                onClick={() => setGridPage(p => Math.min(totalGridPages - 1, p + 1))}
                                                disabled={safeGridPage === totalGridPages - 1}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-card/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                            >
                                                <ChevronRight className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isRoomScreenSharing && isPeopleCollapsed && (
                                <div className="shrink-0 flex justify-center pb-3">
                                    <button
                                        onClick={() => setIsPeopleCollapsed(false)}
                                        className="flex items-center gap-2 bg-card/80 backdrop-blur-xl border border-border/40 hover:bg-card transition-all duration-200 rounded-full px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg hover:shadow-xl active:scale-95"
                                    >
                                        <ChevronUp className="w-4 h-4"/>
                                        <Users className="w-4 h-4"/>
                                        {t('room.show_people')} ({Object.keys(remoteParticipants).length + 1})
                                    </button>
                                </div>
                            )}

                            {isRoomScreenSharing && isSidebarOpen && !isPeopleCollapsed && renderPeopleThumbnails('flex-[0.28] min-h-0', true)}
                        </main>

                        <div
                            className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isRightPanelVisible ? 'w-80' : 'w-0'}`}>
                            <div className="h-full p-2">
                                <aside
                                    className="h-full bg-card border border-border/60 rounded-2xl shadow-lg flex flex-col overflow-hidden">

                                    {showEnhancePanel && (
                                        <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                                            <div
                                                className="flex items-center justify-between px-6 py-5 border-b border-border/30 shrink-0">
                                                <span
                                                    className="text-sm font-medium text-foreground/80 flex items-center gap-2.5">
                                                    <Palette className="w-4 h-4 text-foreground/50"/>
                                                    {t('room.enhance_title')}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setEnhanceConfig(c => ({
                                                            ...c,
                                                            enabled: !c.enabled
                                                        }))}
                                                        className={`relative w-9 h-5 rounded-full transition-all duration-300 ${enhanceConfig.enabled ? 'bg-brand' : 'bg-muted-foreground/20'}`}
                                                    >
                                                        <span
                                                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${enhanceConfig.enabled ? 'translate-x-[1.125rem]' : ''}`}/>
                                                    </button>
                                                    <Button variant="ghost" size="icon"
                                                            onClick={() => setShowEnhancePanel(false)}
                                                            className="rounded-lg w-7 h-7 text-muted-foreground/40 hover:text-foreground">
                                                        <X className="w-3.5 h-3.5"/>
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                                                <div className="space-y-5">
                                                    <span
                                                        className="block text-[11px] font-medium text-foreground/40 tracking-wider uppercase">{t('room.enhance_wb')}</span>
                                                    <div className="space-y-5">
                                                        <div className="flex items-center justify-between">
                                                            <span
                                                                className="text-sm text-foreground/60 flex items-center gap-2.5">
                                                                <Thermometer className="w-4 h-4 text-foreground/35"/>
                                                                {t('room.enhance_awb_auto')}
                                                            </span>
                                                            <button
                                                                onClick={() => setEnhanceConfig(c => ({
                                                                    ...c,
                                                                    autoWhiteBalance: !c.autoWhiteBalance
                                                                }))}
                                                                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${enhanceConfig.autoWhiteBalance ? 'bg-brand' : 'bg-muted-foreground/20'}`}
                                                            >
                                                                <span
                                                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${enhanceConfig.autoWhiteBalance ? 'translate-x-[1.125rem]' : ''}`}/>
                                                            </button>
                                                        </div>
                                                        {!enhanceConfig.autoWhiteBalance && (
                                                            <SliderControl label={t('room.enhance_wb')}
                                                                           value={enhanceConfig.whiteBalance} min={-1}
                                                                           max={1} step={0.05}
                                                                           onChange={v => setEnhanceConfig(c => ({
                                                                               ...c,
                                                                               whiteBalance: v
                                                                           }))}
                                                                           icon={<Thermometer
                                                                               className="w-4 h-4 text-foreground/35"/>}/>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-5">
                                                    <span
                                                        className="block text-[11px] font-medium text-foreground/40 tracking-wider uppercase">{t('room.enhance_title')}</span>
                                                    <div className="space-y-5">
                                                        <SliderControl label={t('room.enhance_brightness')}
                                                                       value={enhanceConfig.brightness} min={-0.5}
                                                                       max={0.5} step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           brightness: v
                                                                       }))} icon={<Sun
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                        <SliderControl label={t('room.enhance_contrast')}
                                                                       value={enhanceConfig.contrast} min={0.5} max={2}
                                                                       step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           contrast: v
                                                                       }))} icon={<Contrast
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                        <SliderControl label={t('room.enhance_gamma')}
                                                                       value={enhanceConfig.gamma} min={0.5} max={2.5}
                                                                       step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           gamma: v
                                                                       }))} icon={<SlidersHorizontal
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                        <SliderControl label={t('room.enhance_saturation')}
                                                                       value={enhanceConfig.saturation} min={0} max={2}
                                                                       step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           saturation: v
                                                                       }))} icon={<Palette
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                    </div>
                                                </div>

                                                <div className="space-y-5">
                                                    <span
                                                        className="block text-[11px] font-medium text-foreground/40 tracking-wider uppercase">Detalles</span>
                                                    <div className="space-y-5">
                                                        <SliderControl label={t('room.enhance_sharpness')}
                                                                       value={enhanceConfig.sharpness} min={0} max={1.5}
                                                                       step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           sharpness: v
                                                                       }))} icon={<Sparkles
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                        <SliderControl label={t('room.enhance_denoise')}
                                                                       value={enhanceConfig.denoise} min={0} max={1}
                                                                       step={0.05}
                                                                       onChange={v => setEnhanceConfig(c => ({
                                                                           ...c,
                                                                           denoise: v
                                                                       }))} icon={<Droplets
                                                            className="w-4 h-4 text-foreground/35"/>}/>
                                                    </div>
                                                </div>

                                                <div className="pt-1">
                                                    <button
                                                        onClick={() => setEnhanceConfig({
                                                            ...DEFAULT_ENHANCEMENT,
                                                            enabled: enhanceConfig.enabled
                                                        })}
                                                        className="flex items-center gap-1.5 text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5"/>
                                                        {t('room.enhance_reset')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'flex-1 min-h-0' : 'h-0'}`}>
                                        <div
                                            className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Users className="w-4 h-4 text-brand"/>
                                                {t('room.participants')} ({totalParticipants})
                                            </h3>
                                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}
                                                    className="rounded-full w-8 h-8 shrink-0">
                                                <X className="w-4 h-4"/>
                                            </Button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            <div
                                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                                                <div
                                                    className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-semibold overflow-hidden shrink-0">
                                                    {localAvatarUrl ? (
                                                        <img src={localAvatarUrl} alt={displayName}
                                                             className="w-full h-full object-cover"/>
                                                    ) : (
                                                        <User className="w-5 h-5 text-brand"/>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">
                                                        {displayName}
                                                        <span
                                                            className="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded ml-1 whitespace-nowrap">{t('room.you')}</span>
                                                    </p>
                                                    {displayUsername &&
                                                        <p className="text-xs text-muted-foreground truncate">{displayUsername}</p>}
                                                </div>
                                                {isHandRaised && <Hand className="w-4 h-4 text-amber-500 shrink-0"/>}
                                                {isAudioMuted && <MicOff className="w-4 h-4 text-red-500 shrink-0"/>}
                                            </div>

                                            {Object.values(remoteParticipants).map((info) => {
                                                const remoteName = info.fullName || t('room.participant')
                                                const remoteUsername = info.username ? `@${info.username}` : ''
                                                return (
                                                    <div key={info.socketId} className="flex items-center gap-3 p-2">
                                                        <div
                                                            className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-semibold overflow-hidden shrink-0">
                                                            {info.avatarUrl ? (
                                                                <img src={info.avatarUrl} alt={remoteName}
                                                                     className="w-full h-full object-cover"/>
                                                            ) : (
                                                                <User className="w-5 h-5 text-brand"/>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium truncate">{remoteName}</p>
                                                            {remoteUsername &&
                                                                <p className="text-xs text-muted-foreground truncate">{remoteUsername}</p>}
                                                        </div>
                                                        {info.isHandRaised &&
                                                            <Hand className="w-4 h-4 text-amber-500 shrink-0"/>}
                                                        {info.isAudioMuted &&
                                                            <MicOff className="w-4 h-4 text-red-500 shrink-0"/>}
                                                    </div>
                                                )
                                            })}

                                            {requests.length > 0 && (
                                                <div className="pt-4 space-y-3">
                                                    <div className="flex items-center gap-2 px-2">
                                                        <ShieldAlert className="w-4 h-4 text-amber-500"/>
                                                        <span
                                                            className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                                                            {t('room.join_requests')}
                                                        </span>
                                                    </div>
                                                    {requests.map((req) => (
                                                        <div key={req.id}
                                                             className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-semibold overflow-hidden shrink-0">
                                                                    <span
                                                                        className="text-sm">{req.guest_name.slice(0, 2).toUpperCase()}</span>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium truncate">{req.guest_name}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-card/50 p-2 rounded-md border border-border/30">
                                                                {t('room.guest_warning')}
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    onClick={() => approveRequest(req.id)}
                                                                    className="flex-1 h-8 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white"
                                                                >
                                                                    <Check className="w-3.5 h-3.5 mr-1"/>
                                                                    {t('room.guest_approve')}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => rejectRequest(req.id)}
                                                                    className="flex-1 h-8 text-xs rounded-lg"
                                                                >
                                                                    <X className="w-3.5 h-3.5 mr-1"/>
                                                                    {t('room.guest_reject')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 border-t border-border/40 shrink-0">
                                            <Button
                                                onClick={handleCopyUrl}
                                                className={`w-full gap-2 rounded-xl transition-all duration-300 ${isUrlCopied ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-brand hover:bg-brand/90 text-primary-foreground'}`}
                                            >
                                                {isUrlCopied ? (
                                                    <><Check className="w-4 h-4"/> {t('room.copied')}</>
                                                ) : (
                                                    <><Share2 className="w-4 h-4"/> {t('room.share_url')}</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {isRoomScreenSharing && !isSidebarOpen && !isPeopleCollapsed && !showEnhancePanel && renderPeopleThumbnails()}
                                </aside>
                            </div>
                        </div>
                    </div>

                    <footer
                        className="shrink-0 flex items-center justify-center bg-background/80 backdrop-blur-xl border-t border-border/40 h-16 relative">
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon-lg"
                                variant={isAudioMuted ? 'destructive' : 'secondary'}
                                onClick={handleToggleAudio}
                                className="rounded-xl transition-all duration-200 active:scale-90"
                            >
                                {isAudioMuted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                            </Button>
                            <Button
                                size="icon-lg"
                                variant={isVideoStopped ? 'destructive' : 'secondary'}
                                onClick={handleToggleVideo}
                                className="rounded-xl transition-all duration-200 active:scale-90"
                            >
                                {isVideoStopped ? <CameraOff className="w-5 h-5"/> : <Camera className="w-5 h-5"/>}
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={isScreenSharing ? 'default' : 'secondary'}
                                onClick={handleToggleScreenShare}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${isScreenSharing ? 'bg-brand text-primary-foreground shadow-lg shadow-brand/30' : ''}`}
                            >
                                {isScreenSharing ? <StopCircle className="w-5 h-5"/> : <MonitorUp className="w-5 h-5"/>}
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={isHandRaised ? 'default' : 'secondary'}
                                onClick={handleToggleHand}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${isHandRaised ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30' : ''}`}
                            >
                                <Hand className="w-5 h-5"/>
                            </Button>

                            <Button
                                size="icon-lg"
                                variant={showEnhancePanel ? 'default' : 'secondary'}
                                onClick={() => {
                                    setShowEnhancePanel(v => !v);
                                    setIsSidebarOpen(false)
                                }}
                                className={`rounded-xl transition-all duration-200 active:scale-90 ${showEnhancePanel ? 'bg-brand text-primary-foreground shadow-lg shadow-brand/30' : ''}`}
                                title={t('room.enhance_toggle')}
                            >
                                <Palette className="w-5 h-5"/>
                            </Button>

                            <div className="relative" ref={pickerRef}>
                                <Button
                                    size="icon-lg"
                                    variant={showReactionPicker ? 'default' : 'secondary'}
                                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                                    className={`rounded-xl transition-all duration-200 active:scale-90 ${showReactionPicker ? 'bg-brand text-primary-foreground shadow-lg shadow-brand/30' : ''}`}
                                    title={t('room.react')}
                                >
                                    <SmilePlus className="w-5 h-5"/>
                                </Button>
                                {showReactionPicker && (
                                    <div
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-2 flex gap-1.5 z-10">
                                        {EMOJI_LIST.map(({emoji, label}) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReact(emoji)}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted/80 transition-all duration-150 active:scale-90 hover:scale-110"
                                            >
                                                <img
                                                    src={getEmojiUrl(emoji)}
                                                    alt={label}
                                                    aria-label={emoji}
                                                    draggable={false}
                                                    className="w-7 h-7"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <span className="w-px h-8 bg-border/60 mx-1"/>

                            <div className="relative">
                                <Button
                                    size="icon-lg"
                                    variant={isSidebarOpen ? 'default' : 'secondary'}
                                    onClick={() => {
                                        setIsSidebarOpen(!isSidebarOpen);
                                        setShowEnhancePanel(false)
                                    }}
                                    className={`rounded-xl transition-all duration-200 active:scale-90 ${isSidebarOpen ? 'bg-brand text-primary-foreground' : ''}`}
                                >
                                    <Users className="w-5 h-5"/>
                                </Button>
                                {requests.length > 0 && !isSidebarOpen && (
                                    <span
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-md">
                                        {requests.length}
                                    </span>
                                )}
                            </div>

                            <span className="w-px h-8 bg-border/60 mx-1"/>
                            <Button
                                size="lg"
                                variant="destructive"
                                onClick={handleLeaveRoom}
                                className="rounded-xl px-6 gap-2 shadow-lg shadow-destructive/20 transition-all duration-200 hover:shadow-destructive/30 active:scale-95"
                            >
                                <PhoneOff className="w-5 h-5"/>
                                {t('room.leave')}
                            </Button>
                        </div>
                    </footer>
                </div>
            </div>

            {allReactions.length > 0 && (
                <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
                    {allReactions.map(r => (
                        <div
                            key={r.id}
                            className="absolute animate-reaction leading-none"
                            style={{bottom: `calc(1rem + ${r.y}px)`, left: `calc(120px + ${r.x}px)`}}
                        >
                            <img
                                src={getEmojiUrl(r.emoji)}
                                alt={r.emoji}
                                draggable={false}
                                style={{width: r.size + 'px', height: r.size + 'px'}}
                            />
                        </div>
                    ))}
                </div>
            )}

            {(isSidebarOpen || showEnhancePanel) && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => {
                        setIsSidebarOpen(false);
                        setShowEnhancePanel(false)
                    }}
                />
            )}
        </div>
    )
}
