'use client'

import { createContext, useContext, useCallback, useSyncExternalStore, useRef } from 'react'
import type { Locale } from '@/i18n/types'
import type { NestedTranslations } from '@/i18n/types'
import { en } from '@/i18n/en'
import { es } from '@/i18n/es'

const STORAGE_KEY = 'lang'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'en' || stored === 'es') return stored
  const system = navigator.language?.startsWith('es') ? 'es' : 'en'
  return system
}

let currentLocale = getInitialLocale()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return currentLocale
}

function getServerSnapshot() {
  return 'en'
}

function emitChange() {
  listeners.forEach((fn) => fn())
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

const dictionaries: Record<Locale, NestedTranslations> = { en, es }

const I18nContext = createContext<{
  locale: Locale
  t: (key: string) => string
  setLocale: (l: Locale) => void
} | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) as Locale
  const dictRef = useRef(dictionaries[locale])

  if (dictRef.current !== dictionaries[locale]) {
    dictRef.current = dictionaries[locale]
  }

  const setLocale = useCallback((l: Locale) => {
    currentLocale = l
    document.documentElement.setAttribute('lang', l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    emitChange()
  }, [])

  const t = useCallback((key: string): string => {
    return resolvePath(dictRef.current, key)
  }, [])

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
