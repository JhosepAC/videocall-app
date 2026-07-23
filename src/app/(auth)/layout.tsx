import { Metadata } from 'next'

// SEO optimization for proper platform positioning
export const metadata: Metadata = {
    title: 'Acceso | Plataforma P2P',
    description: 'Inicia sesión o regístrate para acceder a videoconferencias seguras, sin intermediarios y de alta calidad.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden p-4 font-sans">
            {/* Decorative elements for Glassmorphism (Light orbs) */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand rounded-full mix-blend-screen filter blur-[128px] opacity-40"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary rounded-full mix-blend-screen filter blur-[128px] opacity-30"></div>

            {/* Glassmorphism container */}
            <div className="relative z-10 w-full max-w-md bg-glass/5 backdrop-blur-xl border border-glass/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-3xl p-8 sm:p-10 transition-all duration-300">
                {children}
            </div>
        </div>
    )
}