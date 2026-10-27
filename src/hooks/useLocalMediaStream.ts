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
    joinWithoutDevices: () => void
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
    const mountedRef = useRef(false)

    useEffect(() => {
        let isMounted = true
        mountedRef.current = true
        const accept = (stream: MediaStream) => {
            if (!isMounted) { stream.getTracks().forEach(track => track.stop()); return }
            streamRef.current = stream
            const video = stream.getVideoTracks()[0]
            const audio = stream.getAudioTracks()[0]
            setIsVideoStopped(!video)
            setIsAudioMuted(!audio)
            if (video) video.onended = () => setIsVideoStopped(true)
            if (audio) audio.onended = () => setIsAudioMuted(true)
            setLocalStream(stream)
            setStatus('ready')
        }

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {width: {ideal: 1280}, height: {ideal: 720}, frameRate: {ideal: 24, max: 30}, facingMode: 'user'},
                    audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
                })

                if (!isMounted) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }

                accept(stream)
            } catch (err: unknown) {
                if (!isMounted) return
                console.error('[MEDIA ERROR]', err)

                try {
                    const audioOnly = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true}})
                    if (!isMounted) {
                        audioOnly.getTracks().forEach(track => track.stop())
                        return
                    }
                    accept(audioOnly)
                } catch {
                    if (!isMounted) return
                    setStatus('error')
                    setErrorMessage('Failed to access camera or microphone. Please check your browser permissions and ensure no other application is using them.')
                }
            }
        }

        init()

        return () => {
            isMounted = false
            mountedRef.current = false
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
            if (audioTracks[0]?.readyState === 'live') {
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
            if (videoTracks[0]?.readyState === 'live') {
                const nextState = !videoTracks[0].enabled
                videoTracks[0].enabled = nextState
                setIsVideoStopped(!nextState)
                return !nextState
            }
        }
        return isVideoStopped
    }, [isVideoStopped])

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(track => { track.onended = null; track.stop() })
        screenStreamRef.current = null
        setScreenStream(null)
        setIsScreenSharing(false)
    }, [])
    const joinWithoutDevices = useCallback(() => {
        const stream = new MediaStream()
        streamRef.current = stream
        setLocalStream(stream)
        setIsAudioMuted(true)
        setIsVideoStopped(true)
        setErrorMessage(null)
        setStatus('ready')
    }, [])

    const startScreenShare = async (onEnded?: () => void) => {
        try {
            if (screenStreamRef.current) return screenStreamRef.current.getVideoTracks()[0] ?? null
            const displayStream = await navigator.mediaDevices.getDisplayMedia({video: {width: {ideal: 1920, max: 1920}, height: {ideal: 1080, max: 1080}, frameRate: {ideal: 15, max: 30}}})
            if (!mountedRef.current) {
                displayStream.getTracks().forEach(track => track.stop())
                return null
            }
            const screenTrack = displayStream.getVideoTracks()[0]
            if (!screenTrack) {
                displayStream.getTracks().forEach(track => track.stop())
                return null
            }

            screenStreamRef.current = displayStream
            screenTrack.contentHint = 'detail'
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
        stopScreenShare,
        joinWithoutDevices,
    }
}
