'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    if (!email) {
        return { error: 'empty_email' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: 'invalid_email' }
    }

    if (!password) {
        return { error: 'invalid_credentials' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        const message = error.message.toLowerCase()

        if (message.includes('email not confirmed')) {
            return { error: 'email_not_confirmed' }
        }

        if (message.includes('invalid email')) {
            return { error: 'invalid_email' }
        }

        if (message.includes('rate_limit') || message.includes('too many requests')) {
            return { error: 'rate_limited' }
        }

        if (message.includes('invalid login credentials')) {
            return { error: 'invalid_credentials' }
        }

        return { error: 'server_error' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user?.id)
        .single()

    if (!profile?.full_name || !profile?.username) {
        revalidatePath('/', 'layout')
        redirect('/complete-profile')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!email) {
        return { error: 'empty_email' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: 'invalid_email' }
    }

    if (!password) {
        return { error: 'empty_password' }
    }

    if (password.length <= 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/;'`~]/.test(password)) {
        return { error: 'weak_password' }
    }

    if (password !== confirmPassword) {
        return { error: 'passwords_dont_match' }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/complete-profile`,
        },
    })

    if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('already registered')) {
            return { error: 'email_already_registered' }
        }
        return { error: 'server_error' }
    }

    await supabase.from('profiles').upsert({ id: data.user!.id })

    if (data.session) {
        redirect('/complete-profile')
    }

    redirect(`/verify-email?email=${encodeURIComponent(email)}`)
}

export async function completeProfile(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'not_authenticated' }
    }

    const fullName = (formData.get('full_name') as string)?.trim()
    const username = (formData.get('username') as string)?.trim()
    const avatarUrl = (formData.get('avatar_url') as string)?.trim()

    if (!fullName) {
        return { error: 'empty_full_name' }
    }

    if (!username) {
        return { error: 'empty_username' }
    }

    if (!avatarUrl) {
        return { error: 'empty_avatar_url' }
    }

    const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        username,
        avatar_url: avatarUrl,
    })

    if (error) {
        return { error: 'server_error' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function sendPasswordResetEmail(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error) return { error: error.message }
    return { success: true }
}

