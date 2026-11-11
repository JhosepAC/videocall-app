import {type NextRequest, NextResponse} from 'next/server'
import {createServerClient} from '@supabase/ssr'
import {GUEST_COOKIE_NAME, verifyGuestSessionToken} from '@/lib/guest/session'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({request})

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({request})
                    cookiesToSet.forEach(({name, value, options}) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: {user},
    } = await supabase.auth.getUser()

    const guestToken = request.cookies.get(GUEST_COOKIE_NAME)?.value

    if (user) {
        // A real account always wins over a guest session. Clearing the cookie
        // here covers conversion, sign-out leftovers and stale tabs.
        if (request.nextUrl.pathname === '/login') {
            const response = NextResponse.redirect(new URL('/dashboard', request.url))
            if (guestToken) response.cookies.delete(GUEST_COOKIE_NAME)
            return response
        }

        if (guestToken) supabaseResponse.cookies.delete(GUEST_COOKIE_NAME)
        return supabaseResponse
    }

    // Drop expired or tampered guest cookies before they reach a page.
    if (guestToken && !(await verifyGuestSessionToken(guestToken))) {
        supabaseResponse.cookies.delete(GUEST_COOKIE_NAME)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
