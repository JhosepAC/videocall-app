import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground overflow-hidden p-6">
        {/* Decorative light orbs background */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand rounded-full mix-blend-screen filter blur-[140px] opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-brand-secondary rounded-full mix-blend-screen filter blur-[140px] opacity-25"></div>

        <div className="relative z-10 max-w-xl text-center space-y-6">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-muted-foreground to-muted-foreground bg-clip-text text-transparent">
            Videoconferencias P2P Seguras y Libres
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Conéctate directamente con quien quieras, sin intermediarios, sin límites de tiempo y con total privacidad.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-brand-foreground px-8 py-6 rounded-xl shadow-lg hover:shadow-brand/25 transition-all">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-glass/10 bg-glass/5 hover:bg-glass/10 text-foreground px-8 py-6 rounded-xl backdrop-blur-md transition-all">
                Crear Cuenta Gratis
              </Button>
            </Link>
          </div>
        </div>
      </div>
  )
}