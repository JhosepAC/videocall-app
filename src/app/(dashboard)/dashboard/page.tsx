import {Metadata} from "next"
import {createClient} from "@/lib/supabase/server"
import {redirect} from "next/navigation"
import {ThemeProvider} from "@/components/theme/theme-provider"
import {I18nProvider} from "@/components/i18n/i18n-provider"
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
    if (!user) {
        redirect("/login")
    }

    const {data: profile} = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", user.id)
        .single()

    if (!profile?.full_name || !profile?.username) {
        redirect("/complete-profile")
    }

    const firstName = profile.full_name.split(" ")[0]
    const currentYear = new Date().getFullYear()

    return (
        <ThemeProvider>
            <I18nProvider>
                <div
                    className="min-h-screen flex flex-col bg-surface dark:bg-background font-sans transition-colors selection:bg-brand/20">
                    <DashboardContent firstName={firstName} currentYear={currentYear}/>
                </div>
            </I18nProvider>
        </ThemeProvider>
    )
}
