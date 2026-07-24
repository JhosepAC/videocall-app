import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { SettingsView } from './settings-view'

export const metadata: Metadata = {
    title: 'Settings | MeetMesh',
}

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', user.id)
        .single()

    if (!profile?.full_name || !profile?.username) {
        redirect('/complete-profile')
    }

    return (
        <ThemeProvider>
            <I18nProvider>
            <SettingsView
                email={user.email!}
                profile={{
                    full_name: profile.full_name,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                }}
            />
            </I18nProvider>
        </ThemeProvider>
    )
}
