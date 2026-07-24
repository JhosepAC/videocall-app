'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2, PhoneOff, Users, Clock, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'
import { useWebRTC } from '@/hooks/useWebRTC'
import { createClient } from '@/lib/supabase/client'

interface RoomClientProps {
    roomId: string
}

const RemoteVideo = ({ stream, id }: { stream: MediaStream; id: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative w-full h-full bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/40">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-overlay/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-foreground/90 border border-glass/20">
                <Users className="w-3 h-3 inline mr-1.5 -mt-0.5" />
                {id.slice(0, 8)}
            </div>
        </div>
    )
}

export default function RoomClient({ roomId }: RoomClientProps) {
    const {
        localStream,
        status,
        errorMessage,
        isAudioMuted,
        isVideoStopped,
        toggleAudio,
        toggleVideo,
    } = useLocalMediaStream()

    const { t, locale } = useI18n()
    const { remoteStreams } = useWebRTC(roomId, localStream)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const [copied, setCopied] = useState(false)
    const [now, setNow] = useState(new Date())
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setFullName(data.full_name || '')
                        setUsername(data.username || '')
                    }
                })
        })
    }, [])

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    function handleCopyRoomId() {
        navigator.clipboard.writeText(roomId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
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

    const totalParticipants = 1 + Object.keys(remoteStreams).length
    const gridClasses =
        totalParticipants === 1 ? 'grid-cols-1' :
            totalParticipants === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

    const displayName = fullName || 'You'
    const displayUsername = username ? `@${username}` : ''

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <header className="shrink-0 flex items-center justify-center bg-background/80 backdrop-blur-xl border-b border-border/40 h-12">
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

            <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className={`w-full h-full grid gap-3 place-items-center ${gridClasses}`}>
                    <div className="relative w-full h-full min-h-0 bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand/20">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                                isVideoStopped ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                        {isVideoStopped && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-muted-foreground">
                                <CameraOff className="w-12 h-12 mb-2 stroke-[1.5]" />
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-lg shadow-md">
                            <p className="text-xs font-semibold text-black leading-tight">{displayName}</p>
                            {displayUsername && (
                                <p className="text-[10px] text-black/60 leading-tight">{displayUsername}</p>
                            )}
                        </div>
                    </div>

                    {Object.entries(remoteStreams).map(([peerId, stream]) => (
                        <RemoteVideo key={peerId} id={peerId} stream={stream} />
                    ))}
                </div>
            </main>

            <footer className="shrink-0 flex items-center justify-center bg-background/80 backdrop-blur-xl border-t border-border/40 h-16">
                <div className="flex items-center gap-3">
                    <Button
                        size="icon-lg"
                        variant={isAudioMuted ? 'destructive' : 'secondary'}
                        onClick={toggleAudio}
                        className="rounded-xl transition-all duration-200 active:scale-90"
                    >
                        {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button
                        size="icon-lg"
                        variant={isVideoStopped ? 'destructive' : 'secondary'}
                        onClick={toggleVideo}
                        className="rounded-xl transition-all duration-200 active:scale-90"
                    >
                        {isVideoStopped ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </Button>
                    <span className="w-px h-8 bg-border/60 mx-1" />
                    <Button
                        size="lg"
                        variant="destructive"
                        className="rounded-xl px-6 gap-2 shadow-lg shadow-destructive/20 transition-all duration-200 hover:shadow-destructive/30 active:scale-95"
                    >
                        <PhoneOff className="w-5 h-5" />
                        {t('room.leave')}
                    </Button>
                </div>
            </footer>
        </div>
    )
}
