import { useState, useEffect, useRef, useCallback } from 'react'

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
    startScreenShare: (replaceTrackCallback: (track: MediaStreamTrack) => void) => Promise<void>
    stopScreenShare: (replaceTrackCallback: (track: MediaStreamTrack) => void) => void
}

const CAMERA_TIMEOUT_MS = 10_000

async function getCameraStream(signal: AbortSignal): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }

    const tryRes = async (w: number, h: number): Promise<MediaStream> => {
        const c: MediaStreamConstraints = {
            ...constraints,
            video: { width: { ideal: w }, height: { ideal: h }, facingMode: 'user' },
        }
        return navigator.mediaDevices.getUserMedia(c)
    }

    try {
        return await tryRes(640, 480)
    } catch {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        try {
            return await tryRes(320, 240)
        } catch {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true })
            return audioOnly
        }
    }
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
    const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null)

    useEffect(() => {
        let isMounted = true
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                abortController.abort()
                setStatus('error')
                setErrorMessage('Camera did not respond in time. Check permissions and try again.')
            }
        }, CAMERA_TIMEOUT_MS)

        const initMediaStream = async () => {
            try {
                const stream = await getCameraStream(abortController.signal)
                clearTimeout(timeoutId)

                if (!isMounted) {
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }

                streamRef.current = stream
                originalVideoTrackRef.current = stream.getVideoTracks()[0] ?? null
                setIsVideoStopped(!stream.getVideoTracks()[0])
                setLocalStream(stream)
                setStatus('ready')
            } catch (err: unknown) {
                clearTimeout(timeoutId)
                if (!isMounted || abortController.signal.aborted) return
                console.error('[MEDIA ERROR]', err)
                setStatus('error')
                setErrorMessage('Failed to access camera or microphone. Please check your browser permissions and ensure no other application is using them.')
            }
        }

        initMediaStream()

        return () => {
            isMounted = false
            clearTimeout(timeoutId)
            abortController.abort()
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }
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
    }, [isVideoStopped, isScreenSharing])

    const startScreenShare = async (replaceTrackCallback: (track: MediaStreamTrack) => void) => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
            const screenTrack = displayStream.getVideoTracks()[0]

            replaceTrackCallback(screenTrack)
            setScreenStream(displayStream)
            setIsScreenSharing(true)

            screenTrack.onended = () => {
                stopScreenShare(replaceTrackCallback)
            }

        } catch (err) {
            console.error("Error sharing screen", err)
        }
    }

    const stopScreenShare = (replaceTrackCallback: (track: MediaStreamTrack) => void) => {
        if (originalVideoTrackRef.current) {
            replaceTrackCallback(originalVideoTrackRef.current)

            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop())
                setScreenStream(null)
            }
            setIsScreenSharing(false)
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