import {Metadata} from 'next'
import {ThemeProvider} from '@/components/theme/theme-provider'
import {I18nProvider} from '@/components/i18n/i18n-provider'
import RoomClient from './RoomClient'

export const metadata: Metadata = {
    title: 'Meeting Room | MeetMesh',
    description: 'Secure P2P video conference. Direct real-time communication.',
}

export default async function RoomPage({params}: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;

    return (
        <ThemeProvider>
            <I18nProvider>
                <div className="min-h-screen bg-background">
                    <RoomClient roomId={resolvedParams.id}/>
                </div>
            </I18nProvider>
        </ThemeProvider>
    )
}