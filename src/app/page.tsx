import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden p-6">
        {/* Decorative light orbs background */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[140px] opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[140px] opacity-25"></div>

        <div className="relative z-10 max-w-xl text-center space-y-6">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Videoconferencias P2P Seguras y Libres
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            Conéctate directamente con quien quieras, sin intermediarios, sin límites de tiempo y con total privacidad.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 py-6 rounded-xl backdrop-blur-md transition-all">
                Crear Cuenta Gratis
              </Button>
            </Link>
          </div>
        </div>
      </div>
  )
}