import { Metadata } from 'next'
import RoomClient from './RoomClient'

export const metadata: Metadata = {
    title: 'Sala de Reunión | MeetMesh',
    description: 'Videoconferencia P2P segura. Comunicación directa en tiempo real.',
}

export default function RoomPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-slate-950">
            <RoomClient roomId={params.id} />
        </div>
    )
}