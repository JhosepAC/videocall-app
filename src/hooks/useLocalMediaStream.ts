import { useState, useEffect, useRef, useCallback } from 'react'

export type StreamStatus = 'idle' | 'requesting' | 'ready' | 'error'

interface UseLocalMediaStreamReturn {
    localStream: MediaStream | null
    status: StreamStatus
    errorMessage: string | null
    isAudioMuted: boolean
    isVideoStopped: boolean
    toggleAudio: () => void
    toggleVideo: () => void
}

export function useLocalMediaStream(): UseLocalMediaStreamReturn {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [status, setStatus] = useState<StreamStatus>('requesting')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false)
    const [isVideoStopped, setIsVideoStopped] = useState<boolean>(false)

    // Ref to hold current stream across renders without causing re-triggering of effects
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        let isMounted = true

        const initMediaStream = async () => {
            try {
                // Optimal constraints for WebRTC audio/video quality
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                })

                if (!isMounted) {
                    // Stop tracks if component unmounted before getUserMedia resolved
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }

                streamRef.current = stream
                setLocalStream(stream)
                setStatus('ready')
            } catch (err: unknown) {
                if (!isMounted) return

                console.error('[MEDIA ERROR] Failed to access local devices:', err)
                setStatus('error')

                // Detailed user-friendly error messages based on DOMException name
                if (err instanceof DOMException) {
                    switch (err.name) {
                        case 'NotAllowedError':
                        case 'PermissionDeniedError':
                            setErrorMessage('Permiso denegado. Por favor, permite el acceso a tu cámara y micrófono.')
                            break
                        case 'NotFoundError':
                        case 'DevicesNotFoundError':
                            setErrorMessage('No se encontró ninguna cámara o micrófono conectado.')
                            break
                        case 'NotReadableError':
                        case 'TrackStartError':
                            setErrorMessage('Tu cámara o micrófono ya está siendo usado por otra aplicación.')
                            break
                        default:
                            setErrorMessage('Error al acceder a los dispositivos de medios.')
                    }
                } else {
                    setErrorMessage('Error desconocido al inicializar el hardware.')
                }
            }
        }

        initMediaStream()

        // Cleanup: Stop all tracks on unmount to release camera/mic hardware
        return () => {
            isMounted = false
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }
        }
    }, [])

    // Toggle local audio track
    const toggleAudio = useCallback(() => {
        if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks()
            if (audioTracks.length > 0) {
                const nextState = !audioTracks[0].enabled
                audioTracks[0].enabled = nextState
                setIsAudioMuted(!nextState)
            }
        }
    }, [])

    // Toggle local video track
    const toggleVideo = useCallback(() => {
        if (streamRef.current) {
            const videoTracks = streamRef.current.getVideoTracks()
            if (videoTracks.length > 0) {
                const nextState = !videoTracks[0].enabled
                videoTracks[0].enabled = nextState
                setIsVideoStopped(!nextState)
            }
        }
    }, [])

    return {
        localStream,
        status,
        errorMessage,
        isAudioMuted,
        isVideoStopped,
        toggleAudio,
        toggleVideo,
    }
}