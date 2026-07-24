import { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme/theme-provider'
import RoomClient from './RoomClient'

export const metadata: Metadata = {
    title: 'Meeting Room | MeetMesh',
    description: 'Secure P2P video conference. Direct real-time communication.',
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
