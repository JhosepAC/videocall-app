'use client'

import { useI18n } from '@/components/i18n/i18n-provider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Video, Link as LinkIcon, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock } from './clock'

interface Props {
    firstName: string
    currentYear: number
}

export function DashboardContent({ firstName, currentYear }: Props) {
    const { t } = useI18n()
    const router = useRouter()

    return (
        <>
            <nav className="sticky top-0 z-50 w-full bg-background/60 dark:bg-background/60 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
                            <Video className="w-5 h-5 text-brand" />
                        </div>
                        <span className="font-semibold text-foreground tracking-tight text-lg">MeetMesh</span>
                    </div>
                    <Link
                        href="/settings"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                        <Settings className="w-5 h-5" />
                    </Link>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
                    <div className="space-y-1">
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                            {t('dashboard.greeting')} {firstName}
                        </h1>
                        <p className="text-muted-foreground text-lg md:text-xl font-light">
                            {t('dashboard.subtitle')}
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <Clock />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl">
                    <div className="group relative overflow-hidden rounded-3xl bg-card/50 dark:bg-card/20 border border-border/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-brand/5 hover:border-brand/30 transition-all duration-500 p-8 flex flex-col justify-between h-72">
                        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand/10 blur-3xl group-hover:bg-brand/20 transition-all duration-500" />

                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-6 border border-brand/20">
                                <Plus className="w-7 h-7 text-brand" />
                            </div>
                            <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">{t('dashboard.new_meeting')}</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {t('dashboard.new_meeting_desc')}
                            </p>
                        </div>

                        <form action="/api/create-room" method="POST" className="mt-6 relative z-10">
                            <Button type="submit" size="lg" className="w-full bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm rounded-xl font-medium transition-transform active:scale-[0.98]">
                                {t('dashboard.start_now')}
                            </Button>
                        </form>
                    </div>

                    <div className="group relative overflow-hidden rounded-3xl bg-card/50 dark:bg-card/20 border border-border/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-500 p-8 flex flex-col justify-between h-72">
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6 border border-border">
                                <LinkIcon className="w-7 h-7 text-foreground/70" />
                            </div>
                            <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">{t('dashboard.join_code')}</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {t('dashboard.join_code_desc')}
                            </p>
                        </div>

                        <form className="mt-6 relative z-10 flex gap-3" onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const roomCode = formData.get("roomCode")
                            if (roomCode) router.push(`/room/${roomCode}`)
                        }}>
                            <Input
                                name="roomCode"
                                placeholder={t('common.placeholder_room_code')}
                                className="h-12 bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-brand rounded-xl shadow-inner"
                                required
                            />
                            <Button type="submit" size="lg" variant="secondary" className="h-12 rounded-xl font-medium bg-secondary/80 hover:bg-secondary">
                                {t('dashboard.join')}
                            </Button>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="w-full border-t border-border/40 bg-background/40 backdrop-blur-sm mt-auto">
                <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground font-light">
                        &copy; {currentYear} MeetMesh. {t('dashboard.footer')}
                    </p>
                    <p className="text-sm text-muted-foreground font-light">
                        {t('dashboard.developed_by')}{" "}
                        <Link
                            href="https://jhosep-ac.pages.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground/80 hover:text-brand transition-colors underline-offset-4 hover:underline"
                        >
                            Jhosep AC
                        </Link>
                    </p>
                </div>
            </footer>
        </>
    )
}
