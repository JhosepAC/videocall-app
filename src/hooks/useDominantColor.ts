'use client'

import { useEffect, useState } from 'react'

const cache = new Map<string, string>()

function getAverageColor(data: Uint8ClampedArray): { r: number; g: number; b: number } | null {
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]
        if (a > 128) {
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
        }
    }
    if (count === 0) return null
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
}

export function useDominantColor(imageUrl: string | null): string | null {
    const [color, setColor] = useState<string | null>(null)

    useEffect(() => {
        if (!imageUrl) {
            setColor(null)
            return
        }

        if (cache.has(imageUrl)) {
            setColor(cache.get(imageUrl)!)
            return
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        const separator = imageUrl.includes('?') ? '&' : '?'
        img.src = `${imageUrl}${separator}_dc=${Date.now()}`

        img.onload = () => {
            const canvas = document.createElement('canvas')
            const size = 5
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                setColor(null)
                return
            }

            try {
                ctx.drawImage(img, 0, 0, size, size)
                const data = ctx.getImageData(0, 0, size, size).data
                const avg = getAverageColor(data)
                if (!avg) {
                    setColor(null)
                    return
                }
                const color = `rgb(${avg.r}, ${avg.g}, ${avg.b})`
                cache.set(imageUrl, color)
                setColor(color)
            } catch {
                setColor(null)
            }
        }

        img.onerror = () => setColor(null)
    }, [imageUrl])

    return color
}
