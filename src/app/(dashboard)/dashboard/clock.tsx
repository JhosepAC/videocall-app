'use client'

import { useEffect, useState } from 'react'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatDate(d: Date): string {
    return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
