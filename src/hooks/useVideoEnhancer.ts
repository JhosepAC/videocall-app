'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WebGLPipeline, EnhancementConfig, DEFAULT_ENHANCEMENT } from '@/lib/video/webgl-pipeline'

export type { EnhancementConfig }
export { DEFAULT_ENHANCEMENT }

export function useVideoEnhancer(
  localStream: MediaStream | null,
  config: EnhancementConfig
) {
  const [enhancedTrack, setEnhancedTrack] = useState<MediaStreamTrack | null>(null)
  const pipelineRef = useRef<WebGLPipeline | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!localStream) return

    const video = document.createElement('video')
    video.srcObject = localStream
    video.playsInline = true
    video.muted = true
    video.style.display = 'none'
    document.body.appendChild(video)

    const pipeline = new WebGLPipeline()

    const onReady = () => {
      pipeline.attachVideo(video)
      pipeline.start()
      const track = pipeline.getOutputTrack(30)
      if (track) {
        setEnhancedTrack(track)
      }
    }

    video.addEventListener('loadeddata', onReady, { once: true })
    video.play().catch(() => {
      video.muted = true
      video.play().catch(() => {})
    })

    pipelineRef.current = pipeline
    videoRef.current = video

    return () => {
      pipeline.destroy()
      video.pause()
      video.remove()
      pipelineRef.current = null
      videoRef.current = null
      setEnhancedTrack(null)
    }
  }, [localStream])

  useEffect(() => {
    pipelineRef.current?.updateConfig(config)
  }, [config])

  const recreateTrack = useCallback(() => {
    const p = pipelineRef.current
    if (!p) return
    const old = enhancedTrack
    const track = p.getOutputTrack(30)
    if (track) {
      setEnhancedTrack(track)
    }
    if (old) {
      old.stop()
    }
  }, [enhancedTrack])

  return { enhancedTrack, recreateTrack }
}
