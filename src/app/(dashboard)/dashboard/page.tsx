import {Metadata} from "next"
import {createClient} from "@/lib/supabase/server"
import {redirect} from "next/navigation"
import {ThemeProvider} from "@/components/theme/theme-provider"
import {I18nProvider} from "@/components/i18n/i18n-provider"
import {getGuestSession} from "@/lib/guest/server"
import {DashboardContent} from "./dashboard-content"

export const metadata: Metadata = {
    title: "Dashboard | Video Conference Platform",
    description: "Manage your high-quality P2P meeting rooms.",
    authors: [{name: "Jhosep Argomedo"}],
    keywords: ["WebRTC", "React", "Software Engineering", "Video Conferencing"],
}

export default async function DashboardPage() {
    const supabase = await createClient()

    const {data: {user}} = await supabase.auth.getUser()

    // A guest session is only considered when there is no real account. A
    // Supabase user always takes precedence and the middleware clears any
    // leftover guest cookie.
    const guest = user ? null : await getGuestSession()

    if (!user && !guest) {
        redirect("/login")
    }

    let firstName = ""
    if (user) {
        const {data: profile} = await supabase
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("id", user.id)
            .single()

        if (!profile?.full_name || !profile?.username) {
            redirect("/complete-profile")
        }

        firstName = profile.full_name.split(" ")[0]
    }

    const currentYear = new Date().getFullYear()

    return (
        <ThemeProvider>
            <I18nProvider>
                <div
                    className="min-h-screen flex flex-col bg-surface dark:bg-background font-sans transition-colors selection:bg-brand/20">
                    <DashboardContent
                        firstName={firstName}
                        currentYear={currentYear}
                        isGuest={!user}
                        guestExpiresAt={guest ? new Date(guest.exp * 1000).toISOString() : undefined}
                    />
                </div>
            </I18nProvider>
        </ThemeProvider>
    )
}
