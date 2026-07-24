'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2, PhoneOff, Copy, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'
import { useWebRTC } from '@/hooks/useWebRTC'

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
        <div className="relative w-full h-full min-h-[200px] bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/40">
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

    const { t } = useI18n()
    const { remoteStreams } = useWebRTC(roomId, localStream)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const [copied, setCopied] = useState(false)

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
        totalParticipants === 1 ? 'grid-cols-1 max-w-4xl' :
            totalParticipants === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-card/70 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/5 px-4 py-2 rounded-full">
                <button
                    onClick={handleCopyRoomId}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Copy room ID"
                >
                    <span className="font-mono text-xs tracking-wider select-all">{roomId}</span>
                    {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                </button>
                <span className="w-px h-4 bg-border" />
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {totalParticipants}
                </span>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 pt-20 pb-28">
                <div className={`w-full h-full grid gap-4 place-items-center ${gridClasses} transition-all duration-500`}>
                    <div className="relative w-full h-full min-h-[200px] bg-card/80 rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand/20">
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
                        <div className="absolute bottom-3 left-3 bg-brand/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-brand-foreground shadow-md border border-brand/30">
                            {t('room.you_local')}
                        </div>
                    </div>

                    {Object.entries(remoteStreams).map(([peerId, stream]) => (
                        <RemoteVideo key={peerId} id={peerId} stream={stream} />
                    ))}
                </div>
            </main>

            <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card/80 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/10 px-5 py-3 rounded-2xl">
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
            </footer>
        </div>
    )
}
