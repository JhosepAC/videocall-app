import Link from 'next/link'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
    return (
        <div className="flex flex-col space-y-6 text-foreground">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Bienvenido de nuevo</h1>
                <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
            </div>

            <form action={login} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-surface-foreground/80">Correo Electrónico</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        required
                        className="bg-overlay/20 border-glass/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-brand transition-all shadow-inner"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-surface-foreground/80">Contraseña</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="bg-overlay/20 border-glass/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-brand transition-all shadow-inner"
                    />
                </div>

                {searchParams?.error && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20 text-center">
                        {searchParams.error}
                    </p>
                )}

                <Button type="submit" className="w-full bg-brand hover:bg-brand-hover text-brand-foreground shadow-lg hover:shadow-brand/25 transition-all duration-300">
                    Iniciar Sesión
                </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="text-brand hover:text-brand-hover underline underline-offset-4 transition-colors">
                    Regístrate aquí
                </Link>
            </div>
        </div>
    )
}