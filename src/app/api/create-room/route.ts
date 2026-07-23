import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
    const roomId = randomUUID()

    const roomUrl = new URL(`/room/${roomId}`, request.url)

    return NextResponse.redirect(roomUrl, 303)
}