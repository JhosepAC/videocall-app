'use client'

import { useEffect, useState, useRef } from 'react'
import { Camera, CameraOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RoomClientProps {
    roomId: string
}

type PermissionState = 'requesting' | 'granted' | 'denied'

export default function RoomClient({ roomId }: RoomClientProps) {
    const [status, setStatus] = useState<PermissionState>('requesting')
    const localVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        let localStream: MediaStream | null = null

        const requestMediaPermissions = async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                })

                setStatus('granted')

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream
                }
            } catch (error) {
                console.error('Error al acceder a los dispositivos:', error)
                setStatus('denied')
            }
        }

        requestMediaPermissions()

        return () => {
            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    if (status === 'requesting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Preparando tu sala...</h2>
                <p className="text-slate-400">Por favor, permite el acceso a tu cámara y micrófono en el navegador.</p>
            </div>
        )
    }

    if (status === 'denied') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md text-center backdrop-blur-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
                    <p className="text-slate-400 mb-6">
                        MeetMesh requiere acceso a tu cámara y micrófono para funcionar. Por favor, revisa la configuración de tu navegador y recarga la página.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-slate-800 hover:bg-slate-700 text-white"
                    >
                        Recargar Página
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen p-4 md:p-8">
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

            <main className="flex-1 relative rounded-3xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">

                <div className="relative w-full h-full max-w-4xl max-h-[80vh] aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                    />

                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-white">Tú (Local)</span>
                    </div>
                </div>

            </main>
        </div>
    )
}