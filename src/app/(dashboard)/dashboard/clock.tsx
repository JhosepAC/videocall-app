'use client'

import { useEffect, useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(d: Date): string {
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function Clock() {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-widest">
                {formatDate(now)}
            </span>
            <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight tabular-nums leading-none mt-1">
                {formatTime(now)}
            </span>
        </div>
    )
}
