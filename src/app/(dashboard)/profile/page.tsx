import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const metadata: Metadata = {
    title: 'Mi Perfil | Configuración',
}

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get existing profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', user.id)
        .single()

    // Inline Server Action to update profile
    const updateProfile = async (formData: FormData) => {
        'use server'
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase.from('profiles').upsert({
                id: user.id,
                full_name: formData.get('fullName'),
                username: formData.get('username'),
            })
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 mt-10">
            <div className="bg-card border-border shadow-sm rounded-2xl overflow-hidden transition-all">
                {/* Material Design style header (Color block) */}
                <div className="h-32 bg-gradient-to-r from-brand to-brand-secondary"></div>

                <div className="px-8 pb-8">
                    {/* Overlay avatar (Material) */}
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <Avatar className="w-24 h-24 border-4 border-background shadow-md bg-muted">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="text-2xl text-muted-foreground">
                                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="space-y-1 mb-8">
                        <h2 className="text-2xl font-bold text-card-foreground">Configuración de Perfil</h2>
                        <p className="text-muted-foreground text-sm">Administra tu identidad para las salas de videoconferencia.</p>
                    </div>

                    <form action={updateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-card-foreground/80">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    defaultValue={profile?.full_name || ''}
                                    placeholder="Ej. Jhosep Argomedo"
                                    className="bg-surface dark:bg-background/50 focus-visible:ring-brand"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-card-foreground/80">Nombre de Usuario</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    defaultValue={profile?.username || ''}
                                    placeholder="usuario_dev"
                                    className="bg-surface dark:bg-background/50 focus-visible:ring-brand"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border flex justify-end">
                            <Button type="submit" className="bg-brand hover:bg-brand-hover text-brand-foreground shadow-md">
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}