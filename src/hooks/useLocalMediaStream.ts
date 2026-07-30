import {useCallback, useEffect, useRef, useState} from 'react'

export type StreamStatus = 'idle' | 'requesting' | 'ready' | 'error'

interface UseLocalMediaStreamReturn {
    localStream: MediaStream | null
    screenStream: MediaStream | null
    status: StreamStatus
    errorMessage: string | null
    isAudioMuted: boolean
    isVideoStopped: boolean
    isScreenSharing: boolean
    toggleAudio: () => boolean
    toggleVideo: () => boolean
    startScreenShare: (onEnded?: () => void) => Promise<MediaStreamTrack | null>
    stopScreenShare: () => void
}

export function useLocalMediaStream(): UseLocalMediaStreamReturn {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [status, setStatus] = useState<StreamStatus>('requesting')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false)
    const [isVideoStopped, setIsVideoStopped] = useState<boolean>(false)
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false)
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

    const streamRef = useRef<MediaStream | null>(null)
    const screenStreamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        let isMounted = true
        let upgradeTimeout: ReturnType<typeof setTimeout>

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
                })

                if (!isMounted) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }

                streamRef.current = stream
                setIsVideoStopped(!stream.getVideoTracks()[0])
                setLocalStream(stream)
                setStatus('ready')

                const videoTrack = stream.getVideoTracks()[0]
                if (videoTrack) {
                    upgradeTimeout = setTimeout(async () => {
                        try {
                            await videoTrack.applyConstraints({
                                width: {ideal: 1280},
                                height: {ideal: 720},
                                facingMode: 'user',
                            })
                        } catch {
                            // keep current resolution if upgrade fails
                        }
                    }, 600)
                }
            } catch (err: unknown) {
                if (!isMounted) return
                console.error('[MEDIA ERROR]', err)

                try {
                    const audioOnly = await navigator.mediaDevices.getUserMedia({audio: true})
                    streamRef.current = audioOnly
                    setLocalStream(audioOnly)
                    setIsVideoStopped(true)
                    setStatus('ready')
                } catch {
                    setStatus('error')
                    setErrorMessage('Failed to access camera or microphone. Please check your browser permissions and ensure no other application is using them.')
                }
            }
        }

        init()

        return () => {
            isMounted = false
            clearTimeout(upgradeTimeout)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }
            screenStreamRef.current?.getTracks().forEach(track => track.stop())
            screenStreamRef.current = null
        }
    }, [])

    const toggleAudio = useCallback(() => {
        if (streamRef.current) {
            const audioTracks = streamRef.current.getAudioTracks()
            if (audioTracks.length > 0) {
                const nextState = !audioTracks[0].enabled
                audioTracks[0].enabled = nextState
                setIsAudioMuted(!nextState)
                return !nextState
            }
        }
        return isAudioMuted
    }, [isAudioMuted])

    const toggleVideo = useCallback(() => {
        if (streamRef.current) {
            const videoTracks = streamRef.current.getVideoTracks()
            if (videoTracks.length > 0) {
                const nextState = !videoTracks[0].enabled
                videoTracks[0].enabled = nextState
                setIsVideoStopped(!nextState)
                return !nextState
            }
        }
        return isVideoStopped
    }, [isVideoStopped])

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(track => track.stop())
        screenStreamRef.current = null
        setScreenStream(null)
        setIsScreenSharing(false)
    }, [])

    const startScreenShare = async (onEnded?: () => void) => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({video: true})
            const screenTrack = displayStream.getVideoTracks()[0]
            if (!screenTrack) {
                displayStream.getTracks().forEach(track => track.stop())
                return null
            }

            screenStreamRef.current = displayStream
            setScreenStream(displayStream)
            setIsScreenSharing(true)

            screenTrack.onended = () => {
                stopScreenShare()
                onEnded?.()
            }
            return screenTrack
        } catch (err) {
            console.error("Error sharing screen", err)
            return null
        }
    }

    return {
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
    }
}
