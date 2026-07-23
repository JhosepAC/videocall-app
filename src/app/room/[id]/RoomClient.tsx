'use client'

import { useEffect, useRef } from 'react'
import { Camera, CameraOff, Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalMediaStream } from '@/hooks/useLocalMediaStream'

interface RoomClientProps {
    roomId: string
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

    const localVideoRef = useRef<HTMLVideoElement>(null)

    // Attach local stream to video element when available
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    // 1. Loading State
    if (status === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Iniciando dispositivos...</h2>
                <p className="text-slate-400 text-center max-w-sm">
                    Acepta el permiso del navegador para habilitar tu cámara y micrófono.
                </p>
            </div>
        )
    }

    // 2. Error State
    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md text-center backdrop-blur-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Error de Hardware</h2>
                    <p className="text-slate-400 mb-6">{errorMessage}</p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-slate-800 hover:bg-slate-700 text-white"
                    >
                        Reintentar
                    </Button>
                </div>
            </div>
        )
    }

    // 3. Ready State (Pre-sala con controles de prueba local)
    return (
        <div className="flex flex-col h-screen p-4 md:p-8">
            {/* Room Header */}
            <header className="flex justify-between items-center mb-6 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div>
                    <h1 className="text-xl font-bold text-white">Sala de Reunión</h1>
                    <p className="text-sm text-slate-400 font-mono select-all">ID: {roomId}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                        Salir
                    </Button>
                </div>
            </header>

            {/* Main Video Viewport */}
            <main className="flex-1 relative rounded-3xl overflow-hidden bg-black/50 border border-white/10 flex flex-col items-center justify-center p-4">
                <div className="relative w-full h-full max-w-4xl max-h-[75vh] aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">

                    {/* Local Video Stream */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted // ALWAYS mute local audio to prevent feedback loop
                        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                            isVideoStopped ? 'opacity-0' : 'opacity-100'
                        }`}
                    />

                    {/* Placeholder when video is disabled */}
                    {isVideoStopped && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                            <CameraOff className="w-20 h-20 mb-2 stroke-[1.5]" />
                            <p className="text-sm">Cámara desactivada</p>
                        </div>
                    )}

                    {/* User Status Badge */}
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        {isVideoStopped ? (
                            <CameraOff className="w-4 h-4 text-red-400" />
                        ) : (
                            <Camera className="w-4 h-4 text-green-400" />
                        )}
                        <span className="text-sm font-medium text-white">Tú (Local)</span>
                    </div>

                    {/* In-video Control Toolbar */}
                    <div className="absolute bottom-4 right-4 flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                        <Button
                            size="icon"
                            variant={isAudioMuted ? 'destructive' : 'secondary'}
                            onClick={toggleAudio}
                            className="rounded-lg w-9 h-9"
                        >
                            {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button
                            size="icon"
                            variant={isVideoStopped ? 'destructive' : 'secondary'}
                            onClick={toggleVideo}
                            className="rounded-lg w-9 h-9"
                        >
                            {isVideoStopped ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}