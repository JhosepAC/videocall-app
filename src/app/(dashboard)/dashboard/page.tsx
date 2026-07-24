import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Video, Link as LinkIcon, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// SEO optimization and structured authorship
export const metadata: Metadata = {
    title: "Dashboard | Plataforma de Videoconferencias",
    description: "Gestiona tus salas de reuniones P2P de alta calidad.",
    authors: [{ name: "Jhosep Argomedo" }],
    keywords: ["WebRTC", "React", "Ingeniería de Software", "Videoconferencias"],
}

export default async function DashboardPage() {
    const supabase = await createClient()

    // Check the session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    // Get profile for personalized greeting
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single()

    if (!profile?.full_name || !profile?.username) {
        redirect("/complete-profile")
    }

    const firstName = profile?.full_name?.split(" ")[0] || "Usuario"

    return (
        <div className="min-h-screen bg-surface dark:bg-background font-sans transition-colors">
            {/* Top navbar (Minimalist + Glassmorphism) */}
            <nav className="sticky top-0 z-50 w-full bg-glass/70 dark:bg-background/70 backdrop-blur-md border-b border-border">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                            <Video className="w-4 h-4 text-brand-foreground" />
                        </div>
                        <span className="font-semibold text-foreground tracking-tight">MeetMesh</span>
                    </div>
                    <Link href="/profile">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        Hola, {firstName}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        ¿Qué te gustaría hacer hoy?
                    </p>
                </div>

                {/* Action grid (Material Cards + subtle Glass) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Card 1: Create Meeting */}
                    <div className="group relative overflow-hidden rounded-3xl bg-card border-border shadow-sm hover:shadow-xl hover:shadow-brand/10 transition-all duration-300 p-8 flex flex-col justify-between h-64">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-brand-muted blur-2xl group-hover:bg-brand/20 transition-all"></div>
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-brand-muted flex items-center justify-center mb-6">
                                <Video className="w-6 h-6 text-brand" />
                            </div>
                            <h2 className="text-xl font-semibold text-card-foreground mb-2">Crear nueva reunión</h2>
                            <p className="text-muted-foreground text-sm">Inicia una sala instantánea y comparte el enlace con los demás participantes.</p>
                        </div>

                        <form action="/api/create-room" method="POST" className="mt-4">
                            <Button type="submit" className="w-full bg-brand hover:bg-brand-hover text-brand-foreground shadow-md">
                                Nueva Reunión
                            </Button>
                        </form>
                    </div>

                    {/* Card 2: Join Meeting */}
                    <div className="group relative overflow-hidden rounded-3xl bg-card border-border shadow-sm hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300 p-8 flex flex-col justify-between h-64">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-brand-secondary-muted blur-2xl group-hover:bg-brand-secondary/20 transition-all"></div>
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-brand-secondary-muted flex items-center justify-center mb-6">
                                <LinkIcon className="w-6 h-6 text-brand-secondary" />
                            </div>
                            <h2 className="text-xl font-semibold text-card-foreground mb-2">Unirse con un enlace</h2>
                            <p className="text-muted-foreground text-sm">Ingresa el código o enlace de la sala a la que fuiste invitado.</p>
                        </div>

                        <form className="mt-4 flex gap-2" action={async (formData) => {
                            "use server"
                            const roomCode = formData.get("roomCode")
                            if (roomCode) redirect(`/room/${roomCode}`)
                        }}>
                            <Input
                                name="roomCode"
                                placeholder="Ej. abc-123-xyz"
                                className="bg-surface dark:bg-background/50 border-border focus-visible:ring-brand-secondary"
                                required
                            />
                            <Button type="submit" variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-muted">
                                Unirse
                            </Button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    )
}
