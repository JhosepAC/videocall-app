import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break
            case g:
                h = (b - r) / d + 2;
                break
            case b:
                h = (r - g) / d + 4;
                break
        }
        h /= 6
    }

    return {h: h * 360, s: s * 100, l: l * 100}
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360
    s /= 100
    l /= 100
    let r: number, g: number, b: number

    if (s === 0) {
        r = g = b = l
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    }

    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)}
}

export function parseRgbString(rgb: string): { r: number; g: number; b: number } | null {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (!match) return null
    return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
    }
}

export function getGradientFromColor(rgb: string | null): string {
    // A concrete, opaque fallback is painted on the first frame.  The previous
    // hsl(var(--...)) form is invalid when the theme variables contain oklch(),
    // which made the placeholder transparent and exposed a white flash.
    const fallback = 'linear-gradient(135deg, #334155 0%, #0f172a 100%)'

    if (!rgb) return fallback

    const parsed = parseRgbString(rgb)
    if (!parsed) return fallback

    const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)

    const lightColor = `hsl(
    ${hsl.h},
    ${Math.max(25, Math.min(100, hsl.s * 0.95))}%,
    ${Math.max(22, Math.min(75, hsl.l - 5))}%
  )`

    const darkColor = `hsl(
    ${hsl.h},
    ${Math.max(20, Math.min(100, hsl.s * 0.85))}%,
    ${Math.max(10, hsl.l - 25)}%
  )`

    return `linear-gradient(135deg, ${lightColor}, ${darkColor})`
}

export function getCircularGradientFromColor(rgb: string | null): string {
    const fallback =
        'radial-gradient(circle at center, rgba(128,128,128,0.06) 0%, transparent 100%)'

    if (!rgb) return fallback

    const parsed = parseRgbString(rgb)
    if (!parsed) return fallback

    return `radial-gradient(
    circle at center,
    rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.22) 0%,
    rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.10) 55%,
    rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0) 100%
  )`
}
