'use client'

import Link from 'next/link'
import {Button} from '@/components/ui/button'
import {ArrowRight} from 'lucide-react'
import CursorGrid from '@/components/CursorGrid/CursorGrid'
import {useI18n} from '@/components/i18n/i18n-provider'
import {useEffect} from 'react'

export default function Home() {
    const {t} = useI18n()

    useEffect(() => {
        const timer = setTimeout(() => {
            const canvas = document.querySelector('.cursor-grid__canvas') as HTMLCanvasElement | null
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const event = new PointerEvent('pointerdown', {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                bubbles: true,
                cancelable: true,
            })
            canvas.dispatchEvent(event)
        }, 600)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div
            className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground overflow-hidden p-6">
            <CursorGrid
                cellSize={50}
                color="#444444"
                radius={160}
                falloff="smooth"
                holdTime={600}
                fadeDuration={1000}
                lineWidth={1}
                maxOpacity={0.5}
                fillOpacity={0}
                gridOpacity={0}
                cellRadius={2}
                clickPulse
                pulseSpeed={500}
                className="absolute inset-0 z-0"
            />

            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand/20 to-brand-secondary/15 rounded-full filter blur-[160px] pointer-events-none"/>


            <div className="relative z-10 max-w-3xl text-center space-y-8 flex flex-col items-center">

                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                    {t('landing.title')} <br className="hidden sm:inline"/>
                    <span
                        className="bg-gradient-to-r from-brand via-brand-secondary to-brand bg-clip-text text-transparent">
            {t('landing.subtitle')}
          </span>
                </h1>

                <p className="max-w-xl text-muted-foreground text-base sm:text-lg leading-relaxed font-normal">
                    {t('landing.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full sm:w-auto">
                    <Link href="/login" className="w-full sm:w-auto cursor-pointer">
                        <Button
                            className="w-full sm:w-auto cursor-pointer bg-brand hover:bg-brand-hover text-brand-foreground px-8 py-6 rounded-2xl text-base font-medium shadow-lg shadow-brand/20 hover:shadow-brand/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                            {t('landing.login')}
                        </Button>
                    </Link>

                    <Link href="/register" className="w-full sm:w-auto cursor-pointer">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto cursor-pointer group border-border/60 bg-background/40 hover:bg-accent/50 text-foreground px-8 py-6 rounded-2xl text-base font-medium backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                        >
                            <span>{t('landing.create_account')}</span>
                            <ArrowRight
                                className="w-4 h-4 ml-2 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all"/>
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}