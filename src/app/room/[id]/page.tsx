import {Metadata} from 'next'
import {ThemeProvider} from '@/components/theme/theme-provider'
import {I18nProvider} from '@/components/i18n/i18n-provider'
import {createClient} from '@/lib/supabase/server'
import {getGuestSession} from '@/lib/guest/server'
import {GUEST_DISPLAY_NAME} from '@/lib/guest/session'
import RoomClient from './RoomClient'

export const metadata: Metadata = {
    title: 'Meeting Room | MeetMesh',
    description: 'Secure P2P video conference. Direct real-time communication.',
}

export default async function RoomPage({params}: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;

    // A real Supabase account always wins. The guest session is only passed to
    // the client when no account is present, so the room never starts in the
    // wrong modality.
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()
    const guest = user ? null : await getGuestSession()

    return (
        <ThemeProvider>
            <I18nProvider>
                <div className="min-h-screen bg-background">
                    <RoomClient
                        roomId={resolvedParams.id}
                        guestIdentity={guest ? {id: guest.gid, displayName: GUEST_DISPLAY_NAME} : null}
                    />
                </div>
            </I18nProvider>
        </ThemeProvider>
    )
}
