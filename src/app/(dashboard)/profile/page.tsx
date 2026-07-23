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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-all">
                {/* Material Design style header (Color block) */}
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                <div className="px-8 pb-8">
                    {/* Overlay avatar (Material) */}
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-900 shadow-md bg-slate-100">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="text-2xl text-slate-600">
                                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="space-y-1 mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración de Perfil</h2>
                        <p className="text-slate-500 text-sm">Administra tu identidad para las salas de videoconferencia.</p>
                    </div>

                    <form action={updateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">Nombre Completo</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    defaultValue={profile?.full_name || ''}
                                    placeholder="Ej. Jhosep Argomedo"
                                    className="bg-slate-50 dark:bg-slate-950/50 focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Nombre de Usuario</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    defaultValue={profile?.username || ''}
                                    placeholder="usuario_dev"
                                    className="bg-slate-50 dark:bg-slate-950/50 focus-visible:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md">
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}