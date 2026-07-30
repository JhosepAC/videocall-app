'use client'

import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {createClient} from '@/lib/supabase/client'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    theme: Theme
    setTheme: (t: Theme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}

function applyThemeClass(t: Theme) {
    const root = document.documentElement
    if (t === 'dark') {
        root.classList.add('dark')
    } else if (t === 'light') {
        root.classList.remove('dark')
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
    }
}

function getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved) return saved
    }
    return 'system'
}

export function ThemeProvider({children}: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme)

    useEffect(() => {
        const fallback = getInitialTheme()
        const saved = localStorage.getItem('theme') as Theme | null
        if (!saved) {
            ;(async () => {
                const supabase = createClient()
                const {data: {user}} = await supabase.auth.getUser()
                if (user) {
                    const res = await supabase
                        .from('profiles')
                        .select('theme')
                        .eq('id', user.id)
                        .single()
                    if (res?.data?.theme) {
                        const dbTheme = res.data.theme as Theme
                        localStorage.setItem('theme', dbTheme)
                        setThemeState(dbTheme)
                        applyThemeClass(dbTheme)
                        return
                    }
                }
                applyThemeClass(fallback)
            })()
        } else {
            applyThemeClass(fallback)
        }
    }, [])

    const setTheme = useCallback(async (t: Theme) => {
        setThemeState(t)
        localStorage.setItem('theme', t)
        applyThemeClass(t)

        const supabase = createClient()
        const {data: {user}} = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').upsert({id: user.id, theme: t})
        }
    }, [])

    return (
        <ThemeContext.Provider value={{theme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    )
}
