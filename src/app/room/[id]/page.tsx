import { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme/theme-provider'
import RoomClient from './RoomClient'

export const metadata: Metadata = {
    title: 'Sala de Reunión | MeetMesh',
    description: 'Videoconferencia P2P segura. Comunicación directa en tiempo real.',
}

export default function RoomPage({ params }: { params: { id: string } }) {
    return (
        <ThemeProvider>
            <div className="min-h-screen bg-background">
                <RoomClient roomId={params.id} />
            </div>
        </ThemeProvider>
    )
}
