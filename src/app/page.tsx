'use client'

import Link from 'next/link'
import {ArrowRight, Monitor, Users, Video} from 'lucide-react'
import {useI18n} from '@/components/i18n/i18n-provider'
import {MeetMeshBrand} from '@/components/auth/auth-shell'
import {CallPreview} from '@/components/auth/call-preview'
import '@/components/auth/auth.css'
import './landing.css'

export default function Home() {
    const {t, locale} = useI18n()
    return <div className="entry-page landing-page" lang={locale}>
        <header className="entry-header">
            <MeetMeshBrand/>
            <nav className="landing-nav" aria-label={t('auth.experience.navigation')}>
                <Link href="/login">{t('landing.login')}</Link>
                <Link href="/register" className="landing-nav-cta">{t('auth.register.create_account')}<ArrowRight size={15} aria-hidden="true"/></Link>
            </nav>
        </header>
        <main className="landing-main">
            <div className="landing-intro">
                <h1>{t('landing.title')}<br/>{t('landing.headline_close')}</h1>
                <p>{t('landing.intro')}</p>
                <div className="landing-actions">
                    <Link href="/register" className="landing-primary">{t('landing.create_account')}<ArrowRight size={18} aria-hidden="true"/></Link>
                    <Link href="/login" className="landing-secondary">{t('landing.login')}</Link>
                </div>
                <p className="landing-note">{t('landing.account_note')}</p>
            </div>
            <div className="landing-visual"><CallPreview/><p>{t('landing.preview_hint')}</p></div>
            <section className="landing-capabilities" aria-label={t('landing.features_label')}>
                <div><Video size={19} strokeWidth={1.5} aria-hidden="true"/><h2>{t('landing.direct_title')}</h2><p>{t('landing.direct_description')}</p></div>
                <div><Monitor size={19} strokeWidth={1.5} aria-hidden="true"/><h2>{t('landing.screen_title')}</h2><p>{t('landing.screen_description')}</p></div>
                <div><Users size={19} strokeWidth={1.5} aria-hidden="true"/><h2>{t('landing.guest_title')}</h2><p>{t('landing.guest_description')}</p></div>
            </section>
        </main>
        <footer className="entry-footer"><span>MeetMesh</span><span>{t('auth.experience.footer')}</span></footer>
    </div>
}
