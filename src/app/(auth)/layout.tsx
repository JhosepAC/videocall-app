import { Metadata } from 'next'
import CursorGrid from '@/components/CursorGrid/CursorGrid'

export const metadata: Metadata = {
    title: 'Acceso | Plataforma P2P',
    description: 'Inicia sesión o regístrate para acceder a videoconferencias seguras, sin intermediarios y de alta calidad.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-16px) rotate(1deg); }
                }
                @keyframes floatReverse {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-14px) rotate(-1deg); }
                }
                .animate-float {
                    animation: float var(--dur, 6s) ease-in-out infinite;
                }
                .animate-float-reverse {
                    animation: floatReverse var(--dur, 7s) ease-in-out infinite;
                }
            `}</style>
            <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden p-6 font-sans">
                {/* CursorGrid interactive background (same as landing) */}
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

                {/* Grid texture background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-[1]" />

                {/* Glassmorphism container */}
                <div className="relative z-10 w-full max-w-xl bg-glass/5 backdrop-blur-xl border border-glass/10 ring-1 ring-foreground/5 shadow-[0_8px_48px_0_rgba(0,0,0,0.12)] rounded-3xl p-10 sm:p-12 transition-all duration-300">
                    {children}
                </div>
            </div>
        </>
    )
}
