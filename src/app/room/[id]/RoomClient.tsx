'use client'

import { useEffect, useRef } from 'react'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/i18n-provider'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'
import { useWebRTC } from '@/hooks/useWebRTC'

interface RoomClientProps {
    roomId: string
}

// Sub-component for remote peers to handle their HTMLMediaElement refs safely
const RemoteVideo = ({ stream, id }: { stream: MediaStream; id: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const { t } = useI18n()

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative w-full h-full min-h-[200px] bg-card rounded-2xl overflow-hidden shadow-lg border-border">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-overlay/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-glass/10 text-xs font-medium text-foreground">
                {t('room.participant')}
            </div>
        </div>
    )
}

export default function RoomClient({ roomId }: RoomClientProps) {
    // 1. Initialize local hardware
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

    // 2. Initialize WebRTC Signaling engine ONLY when localStream is ready
    const { remoteStreams } = useWebRTC(roomId, localStream)

    const localVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    if (status === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-foreground p-4">
                <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">{t('room.loading_devices')}</h2>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-foreground p-4">
                <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-3xl max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{t('room.hardware_error')}</h2>
                    <p className="text-muted-foreground mb-6">{errorMessage}</p>
                </div>
            </div>
        )
    }

    // Calculate dynamic grid columns based on number of participants (Mesh Network Limit logic)
    const totalParticipants = 1 + Object.keys(remoteStreams).length
    const gridClasses =
        totalParticipants === 1 ? 'grid-cols-1 max-w-4xl' :
            totalParticipants === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

    return (
        <div className="flex flex-col h-screen p-4 md:p-6 bg-background">
            <header className="flex justify-between items-center mb-4 bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-glass/5">
                <div>
                    <h1 className="text-xl font-bold text-foreground">{t('room.room_header')}</h1>
                    <p className="text-sm text-muted-foreground font-mono select-all">{t('room.room_id')} {roomId}</p>
                </div>
                <Button variant="destructive" className="bg-destructive hover:bg-destructive/80 shadow-lg shadow-destructive/20">
                    {t('room.leave')}
                </Button>
            </header>

            <main className="flex-1 relative rounded-3xl overflow-hidden bg-overlay/40 border border-glass/5 flex flex-col items-center justify-center p-4 md:p-6">

                {/* Responsive Grid System */}
                <div className={`w-full h-full grid gap-4 place-items-center ${gridClasses} transition-all duration-500`}>

                    {/* Local Video */}
                    <div className="relative w-full h-full max-h-[80vh] bg-card rounded-2xl overflow-hidden shadow-lg border border-brand/30">
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
                                <CameraOff className="w-16 h-16 mb-2 stroke-[1.5]" />
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-brand/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-medium text-brand-foreground shadow-md">
                            {t('room.you_local')}
                        </div>

                        {/* Local Controls Toolbar */}
                        <div className="absolute bottom-3 right-3 flex gap-2 bg-overlay/60 backdrop-blur-md p-1.5 rounded-xl border border-glass/10">
                            <Button size="icon" variant={isAudioMuted ? 'destructive' : 'secondary'} onClick={toggleAudio} className="w-8 h-8 rounded-lg">
                                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant={isVideoStopped ? 'destructive' : 'secondary'} onClick={toggleVideo} className="w-8 h-8 rounded-lg">
                                {isVideoStopped ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Remote Videos Mapping */}
                    {Object.entries(remoteStreams).map(([peerId, stream]) => (
                        <RemoteVideo key={peerId} id={peerId} stream={stream} />
                    ))}

                </div>
            </main>
        </div>
    )
}
