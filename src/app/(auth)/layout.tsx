import type {Metadata} from 'next'
import {AuthShell} from '@/components/auth/auth-shell'
import '@/components/auth/auth.css'

export const metadata: Metadata = {
    title: 'Acceso | MeetMesh',
    description: 'Inicia sesión o crea tu cuenta de MeetMesh para conectar por videollamada.',
}

export default function AuthLayout({children}: {children: React.ReactNode}) {
    return <AuthShell>{children}</AuthShell>
}
