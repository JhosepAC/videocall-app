'use client'

import { useEffect, useRef } from 'react'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'
import { useWebRTC } from '@/hooks/useWebRTC'

interface RoomClientProps {
    roomId: string
}

// Sub-component for remote peers to handle their HTMLMediaElement refs safely
const RemoteVideo = ({ stream, id }: { stream: MediaStream; id: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative w-full h-full min-h-[200px] bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-700">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-xs font-medium text-white">
                Participante
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
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Iniciando dispositivos...</h2>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Error de Hardware</h2>
                    <p className="text-slate-400 mb-6">{errorMessage}</p>
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
        <div className="flex flex-col h-screen p-4 md:p-6 bg-slate-950">
            <header className="flex justify-between items-center mb-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div>
                    <h1 className="text-xl font-bold text-white">Sala de Reunión</h1>
                    <p className="text-sm text-slate-400 font-mono select-all">ID: {roomId}</p>
                </div>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20">
                    Abandonar
                </Button>
            </header>

            <main className="flex-1 relative rounded-3xl overflow-hidden bg-black/40 border border-white/5 flex flex-col items-center justify-center p-4 md:p-6">

                {/* Responsive Grid System */}
                <div className={`w-full h-full grid gap-4 place-items-center ${gridClasses} transition-all duration-500`}>

                    {/* Local Video */}
                    <div className="relative w-full h-full max-h-[80vh] bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-indigo-500/30">
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                                <CameraOff className="w-16 h-16 mb-2 stroke-[1.5]" />
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-indigo-600/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-medium text-white shadow-md">
                            Tú (Local)
                        </div>

                        {/* Local Controls Toolbar */}
                        <div className="absolute bottom-3 right-3 flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
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