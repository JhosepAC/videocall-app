'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {ArrowLeft, ArrowUpRight, Video} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {CallPreview} from './call-preview'

export function MeetMeshBrand() {
    return <Link href="/" className="meetmesh-brand" aria-label="MeetMesh">
        <span className="meetmesh-mark"><Video size={20} strokeWidth={1.8} aria-hidden="true"/></span>
        MeetMesh
    </Link>
}

export function AuthShell({children}: {children: React.ReactNode}) {
    const {t, locale} = useI18n()
    const path = usePathname()
    const isEntry = path === '/login' || path === '/register'

    return <div className="entry-page" lang={locale}>
        <header className="entry-header">
            <MeetMeshBrand/>
            <Link href="/" className="entry-home"><ArrowLeft size={15} aria-hidden="true"/>{t('auth.experience.back_home')}</Link>
        </header>
        <main className="auth-main">
            <aside className="auth-story" aria-label={t('auth.experience.about')}>
                <div className="auth-story-copy">
                    <h2>{t('auth.experience.heading')}</h2>
                    <p>{t('auth.experience.description')}</p>
                </div>
                <CallPreview/>
                <p className="auth-story-note">{t('auth.experience.note')}<ArrowUpRight size={17} aria-hidden="true"/></p>
            </aside>
            <section className="auth-workspace">
                <div className="auth-form-wrap">
                    {isEntry && <nav className="auth-switch" aria-label={t('auth.experience.navigation')}>
                        <Link href="/login" aria-current={path === '/login' ? 'page' : undefined}>{t('auth.login.sign_in')}</Link>
                        <Link href="/register" aria-current={path === '/register' ? 'page' : undefined}>{t('auth.register.create_account')}</Link>
                    </nav>}
                    <div key={path} className="auth-route">{children}</div>
                </div>
            </section>
        </main>
        <footer className="entry-footer"><span>MeetMesh</span><span>{t('auth.experience.footer')}</span></footer>
    </div>
}
