'use client'

import {createContext, useCallback, useContext, useEffect, useSyncExternalStore} from 'react'
import type {Locale, NestedTranslations} from '@/i18n/types'
import {en} from '@/i18n/en'
import {es} from '@/i18n/es'

const STORAGE_KEY = 'lang'

function getSystemLocale(): Locale {
    if (typeof window === 'undefined') return 'en'
    return navigator.language?.startsWith('es') ? 'es' : 'en'
}

function resolvePath(obj: NestedTranslations, path: string): string {
    const keys = path.split('.')
    let current: NestedTranslations | string = obj
    for (const key of keys) {
        if (typeof current === 'string') return path
        const next: NestedTranslations | string | undefined = current[key]
        if (next === undefined) return path
        current = next
    }
    return typeof current === 'string' ? current : path
}

const dictionaries: Record<Locale, NestedTranslations> = {en, es}

interface I18nContextValue {
    locale: Locale
    t: (key: string) => string
    setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

const getPreferredLocale = (): Locale => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'es') return stored
    } catch { /* Storage can be unavailable in private contexts. */ }
    return getSystemLocale()
}
const subscribeToPreferredLocale = (onChange: () => void) => {
    window.addEventListener('storage', onChange)
    window.addEventListener('languagechange', onChange)
    window.addEventListener('meetmesh:locale', onChange)
    return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener('languagechange', onChange)
        window.removeEventListener('meetmesh:locale', onChange)
    }
}

export function I18nProvider({children}: { children: React.ReactNode }) {
    const locale = useSyncExternalStore(subscribeToPreferredLocale, getPreferredLocale, getServerLocale)

    useEffect(() => {
        document.documentElement.setAttribute('lang', locale)
    }, [locale])

    const setLocale = useCallback((l: Locale) => {
        document.documentElement.setAttribute('lang', l)
        try {
            localStorage.setItem(STORAGE_KEY, l)
        } catch {
        }
        window.dispatchEvent(new Event('meetmesh:locale'))
    }, [])

    const t = useCallback((key: string): string => {
        return resolvePath(dictionaries[locale], key)
    }, [locale])

    return (
        <I18nContext.Provider value={{locale, t, setLocale}}>
            {children}
        </I18nContext.Provider>
    )
}

const subscribeToSystemLocale = (onChange: () => void) => {
    window.addEventListener('languagechange', onChange)
    return () => window.removeEventListener('languagechange', onChange)
}
const getServerLocale = (): Locale => 'en'

export function SystemI18nProvider({children}: { children: React.ReactNode }) {
    const locale = useSyncExternalStore(subscribeToSystemLocale, getSystemLocale, getServerLocale)

    const t = useCallback((key: string): string => {
        return resolvePath(dictionaries[locale], key)
    }, [locale])

    const setLocale = useCallback(() => {
    }, [])

    return (
        <I18nContext.Provider value={{locale, t, setLocale}}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error('useI18n must be used within I18nProvider')
    return ctx
}
