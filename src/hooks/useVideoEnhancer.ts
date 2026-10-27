'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {DEFAULT_ENHANCEMENT, EnhancementConfig, WebGLPipeline} from '@/lib/video/webgl-pipeline'

export type {EnhancementConfig}
export {DEFAULT_ENHANCEMENT}

export function useVideoEnhancer(
    localStream: MediaStream | null,
    config: EnhancementConfig
) {
    const [enhancedTrack, setEnhancedTrack] = useState<MediaStreamTrack | null>(null)
    const [failure, setFailure] = useState<{stream: MediaStream; message: string} | null>(null)
    const pipelineRef = useRef<WebGLPipeline | null>(null)

    useEffect(() => {
        if (!localStream?.getVideoTracks().length) return

        const video = document.createElement('video')
        video.srcObject = localStream
        video.playsInline = true
        video.muted = true
        video.style.display = 'none'
        document.body.appendChild(video)

        const pipeline = new WebGLPipeline()
        let active = true

        const onReady = () => {
            if (!active) return
            pipeline.attachVideo(video)
            pipeline.start()
            const track = pipeline.getOutputTrack(30)
            if (track) {
                setEnhancedTrack(track)
            } else setFailure({stream: localStream, message: 'Image enhancement is unavailable. Your original camera is still being sent.'})
        }

        video.addEventListener('loadeddata', onReady, {once: true})
        video.play().catch(() => {
            video.muted = true
            video.play().catch(() => {
            })
        })

        pipelineRef.current = pipeline

        return () => {
            active = false
            video.removeEventListener('loadeddata', onReady)
            pipeline.destroy()
            video.pause()
            video.remove()
            pipelineRef.current = null
            setEnhancedTrack(null)
        }
    }, [localStream])

    useEffect(() => {
        pipelineRef.current?.updateConfig(config)
    }, [config])

    const recreateTrack = useCallback(() => {
        const p = pipelineRef.current
        if (!p) return
        const track = p.getOutputTrack(30, true)
        if (track) {
            setEnhancedTrack(track)
        }
    }, [])

    return {enhancedTrack, recreateTrack, error: failure?.stream === localStream ? failure.message : null}
}
