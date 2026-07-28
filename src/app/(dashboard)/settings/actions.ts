'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'You must be signed in to perform this action.' }

    const fullName = (formData.get('fullName') as string)?.trim()
    const username = (formData.get('username') as string)?.trim()
    const avatarUrl = (formData.get('avatarUrl') as string)?.trim() || null

    if (!fullName) return { error: 'Full name is required.' }
    if (!username) return { error: 'Username is required.' }

    const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        username,
        avatar_url: avatarUrl,
    })

    if (error) return { error: error.message }

    revalidatePath('/settings', 'layout')
    return { success: true }
}

export async function updatePassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'You must be signed in to perform this action.' }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!currentPassword) return { error: 'Current password is required.' }

    if (!newPassword || newPassword.length <= 6) {
        return { error: 'New password must be more than 6 characters.' }
    }

    if (!/[A-Z]/.test(newPassword)) {
        return { error: 'New password must have at least one uppercase letter.' }
    }

    if (!/[0-9]/.test(newPassword)) {
        return { error: 'New password must have at least one number.' }
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(newPassword)) {
        return { error: 'New password must have at least one special character.' }
    }

    if (newPassword !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
    })

    if (signInError) {
        return { error: 'Current password is incorrect.' }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }

    return { success: true }
}

export async function savePreferences(theme: string, lang: string): Promise<{ error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'You must be signed in to perform this action.' }

    const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        theme,
        lang,
    })

    if (error) return { error: error.message }
    return {}
}

export async function getPreferences(): Promise<{ theme: string; lang: string } | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data } = await supabase
        .from('profiles')
        .select('theme, lang')
        .eq('id', user.id)
        .single()

    return data ? { theme: data.theme || 'system', lang: data.lang || 'es' } : null
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
