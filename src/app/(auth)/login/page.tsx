import Link from 'next/link'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
    return (
        <div className="flex flex-col space-y-6 text-slate-100">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">Bienvenido de nuevo</h1>
                <p className="text-sm text-slate-400">Ingresa tus credenciales para continuar</p>
            </div>

            <form action={login} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        required
                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 transition-all shadow-inner"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 transition-all shadow-inner"
                    />
                </div>

                {searchParams?.error && (
                    <p className="text-sm text-red-400 bg-red-950/50 p-2 rounded-md border border-red-900/50 text-center">
                        {searchParams.error}
                    </p>
                )}

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-300">
                    Iniciar Sesión
                </Button>
            </form>

            <div className="text-center text-sm text-slate-400">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors">
                    Regístrate aquí
                </Link>
            </div>
        </div>
    )
}