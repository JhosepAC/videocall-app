import {NextResponse} from 'next/server'
import {randomUUID} from 'crypto'
import {createClient} from '@/lib/supabase/server'
import {getGuestSession} from '@/lib/guest/server'

// A relative Location keeps the redirect on the exact origin the browser used.
// `request.url` is normalized by the server and can report a different host
// (for example `localhost` while the visitor is on `127.0.0.1`), which would
// silently drop the host-only guest cookie.
function seeOther(path: string): NextResponse {
    return new NextResponse(null, {status: 303, headers: {Location: path}})
}

export async function POST() {
    // Registered members and verified guest sessions may create a room. Direct
    // anonymous visitors keep the existing join-request lobby in /room/[id].
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()

    if (!user) {
        const guest = await getGuestSession()
        if (!guest) return seeOther('/login')
    }

    const roomId = randomUUID()

    return seeOther(`/room/${roomId}`)
}
