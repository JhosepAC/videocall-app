'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const fullName = (formData.get('fullName') as string)?.trim()
    const username = (formData.get('username') as string)?.trim()

    if (!fullName) return { error: 'El nombre completo es obligatorio' }
    if (!username) return { error: 'El nombre de usuario es obligatorio' }

    const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        username,
    })

    if (error) return { error: error.message }

    revalidatePath('/settings', 'layout')
    return { success: true }
}

export async function updatePassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword) return { error: 'La contraseña actual es obligatoria' }

    if (!newPassword || newPassword.length < 6) {
        return { error: 'La nueva contraseña debe tener al menos 6 caracteres' }
    }

    if (newPassword !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
    })

    if (signInError) {
        return { error: 'La contraseña actual no es correcta' }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }

    return { success: true }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
