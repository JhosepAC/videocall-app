import {test, expect} from '@playwright/test'
import type {Browser, BrowserContext, Page} from '@playwright/test'
import {readFileSync} from 'node:fs'

// Only identity and database requests are fixtures. Socket.IO, SDP, ICE,
// RTCPeerConnection, video, audio and display capture run in the real browser.
const env = readFileSync('.env', 'utf8')
const supabaseUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL=['"]?([^\s'"]+)/m)![1]
const project = new URL(supabaseUrl).hostname.split('.')[0]
async function member(browser: Browser, id: string, name: string, options: {width?: number; audioOnly?: boolean; noDevices?: boolean} = {}) {
    const context = await browser.newContext({locale: 'es-CO', permissions: ['camera', 'microphone'], viewport: {width: options.width || 1440, height: 900}})
    const user = {id, aud: 'authenticated', role: 'authenticated', email: `${id}@example.test`, app_metadata: {}, user_metadata: {full_name: name}, created_at: new Date().toISOString()}
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const token = `${encode({alg: 'HS256', typ: 'JWT'})}.${encode({sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated'})}.test-signature`
    await context.addInitScript(({project, user, token, audioOnly, noDevices}) => {
        const session = JSON.stringify({access_token: token, refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user})
        document.cookie = `sb-${project}-auth-token=base64-${btoa(unescape(encodeURIComponent(session))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}; path=/; SameSite=Lax`
        localStorage.setItem('lang', 'es')
        const NativePeerConnection = window.RTCPeerConnection
        Object.assign(window, {__meetingPeers: []})
        window.RTCPeerConnection = class extends NativePeerConnection {
            constructor(config?: RTCConfiguration) {
                super(config)
                ;(window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.push(this)
            }
        }
        if (audioOnly || noDevices) {
            const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
            navigator.mediaDevices.getUserMedia = constraints => noDevices || constraints?.video ? Promise.reject(new DOMException('No device', 'NotFoundError')) : original(constraints)
        }
    }, {project, user, token, audioOnly: options.audioOnly || false, noDevices: options.noDevices || false})
    await context.route(`${supabaseUrl}/auth/v1/**`, route => route.fulfill({json: user}))
    await context.route(`${supabaseUrl}/rest/v1/profiles*`, route => route.fulfill({json: {id, full_name: name, username: id, avatar_url: null}}))
    await context.route(`${supabaseUrl}/rest/v1/join_requests*`, route => route.fulfill({json: []}))
    await context.route('**/dashboard*', route => route.fulfill({contentType: 'text/html', body: '<html><body>Dashboard fixture</body></html>'}))
    const page = await context.newPage()
    page.on('console', message => { if (message.text().includes('[WebRTC]')) console.log(name, message.text()) })
    return {context, page}
}
async function inMeeting(page: Page, room: string) {
    await page.goto(`/room/${room}`)
    await expect(page.locator('.meeting-header-status')).toHaveAttribute('data-status', 'connected')
}
async function connected(page: Page) {
    try {
        await expect(page.locator('.meeting-video-grid .meeting-tile[data-local=false]')).toHaveAttribute('data-peer-state', 'connected')
    } catch (error) {
        console.log(JSON.stringify(await page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.map(pc => ({
            state: pc.connectionState, signaling: pc.signalingState, ice: pc.iceConnectionState,
            transceivers: pc.getTransceivers().length,
        }))), null, 2))
        throw error
    }
    await expect.poll(() => page.locator('.meeting-video-grid .meeting-tile[data-local=false] video').evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0)
}
async function close(...contexts: BrowserContext[]) { for (const context of contexts) await context.close() }

test('two real peers synchronize media, hand, chat, effects and reconnect', async ({browser}) => {
    const alice = await member(browser, 'alice', 'Alicia Torres')
    const bob = await member(browser, 'bob', 'Bruno Díaz')
    const room = `meeting-${Date.now()}`
    const errors: string[] = []
    for (const {page} of [alice, bob]) page.on('pageerror', error => errors.push(error.message))
    await inMeeting(alice.page, room)
    await inMeeting(bob.page, room)
    await connected(alice.page)
    await connected(bob.page)
    for (const {page} of [alice, bob]) await expect.poll(() => page.evaluate(async () => {
        const peers = (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.filter(pc => pc.connectionState === 'connected')
        let audio = 0, frames = 0
        for (const peer of peers) (await peer.getStats()).forEach(report => {
            if (report.type === 'inbound-rtp') {
                if (report.kind === 'audio') audio += report.bytesReceived || 0
                if (report.kind === 'video') frames += report.framesDecoded || 0
            }
        })
        return audio > 0 && frames > 0
    })).toBe(true)
    await alice.page.screenshot({path: '.taste-skill/after-room-desktop.png'})
    await bob.page.getByRole('button', {name: 'Participantes', exact: true}).click()
    const aliceAtBob = bob.page.locator('[data-participant-id=alice]')
    await alice.page.getByRole('button', {name: 'Silenciar', exact: true}).click()
    await expect(aliceAtBob).toHaveAttribute('data-audio-muted', 'true')
    await alice.page.getByRole('button', {name: 'Apagar cámara', exact: true}).click()
    await expect(aliceAtBob).toHaveAttribute('data-video-muted', 'true')
    await alice.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(await alice.page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers
        .filter(pc => pc.connectionState === 'connected').every(pc => pc.getSenders().filter(sender => sender.track?.kind === 'video').every(sender => !sender.track?.enabled)))).toBe(true)
    await alice.page.getByRole('button', {name: 'Levantar mano', exact: true}).click()
    await expect(aliceAtBob).toHaveAttribute('data-hand-raised', 'true')
    await alice.page.getByRole('button', {name: 'Bajar mano', exact: true}).click()
    await expect(aliceAtBob).toHaveAttribute('data-hand-raised', 'false')
    await alice.page.getByRole('button', {name: 'Activar micro', exact: true}).click()
    await alice.page.getByRole('button', {name: 'Activar cámara', exact: true}).click()
    await expect(aliceAtBob).toHaveAttribute('data-audio-muted', 'false')
    await expect(aliceAtBob).toHaveAttribute('data-video-muted', 'false')
    for (const {page} of [alice, bob]) await page.getByRole('button', {name: 'Chat', exact: true}).click()
    await alice.page.getByLabel('Escribe un mensaje', {exact: true}).fill('Hola Bruno, ¿me escuchas?')
    await alice.page.getByRole('button', {name: 'Enviar mensaje', exact: true}).click()
    await expect(bob.page.locator('.meeting-message p')).toHaveText('Hola Bruno, ¿me escuchas?')
    await bob.page.getByLabel('Escribe un mensaje', {exact: true}).fill('Sí, imagen y audio recibidos.')
    await bob.page.getByLabel('Escribe un mensaje', {exact: true}).press('Enter')
    await expect(alice.page.locator('.meeting-message')).toHaveCount(2)
    await alice.page.screenshot({path: '.taste-skill/after-room-chat.png'})
    await alice.page.getByRole('button', {name: 'Imagen', exact: true}).click()
    await alice.page.getByLabel('Mejorar imagen', {exact: true}).check()
    await connected(alice.page)
    await alice.page.getByLabel('Mejorar imagen', {exact: true}).uncheck()
    await alice.page.getByRole('button', {name: 'Reacciones', exact: true}).click()
    await alice.page.locator('.meeting-reaction-picker button').first().click()
    await expect(bob.page.locator('.meeting-floating-reactions img')).toHaveCount(1)
    // A real network interruption tears down WebSocket/polling and then rejoins.
    await bob.context.setOffline(true)
    await expect(bob.page.locator('.meeting-header-status')).toHaveAttribute('data-status', 'reconnecting')
    await bob.page.getByRole('button', {name: 'Silenciar', exact: true}).click()
    await bob.context.setOffline(false)
    await expect(bob.page.locator('.meeting-header-status')).toHaveAttribute('data-status', 'connected')
    await connected(alice.page)
    await connected(bob.page)
    await expect(bob.page.locator('.meeting-message')).toHaveCount(2)
    await alice.page.getByRole('button', {name: 'Participantes', exact: true}).click()
    await expect(alice.page.locator('[data-participant-id=bob]')).toHaveAttribute('data-audio-muted', 'true')
    await alice.page.getByRole('button', {name: 'Salir', exact: true}).click()
    await expect(alice.page).toHaveURL(/\/dashboard/)
    await expect(bob.page.locator('.meeting-stage-heading')).toContainText('Participantes · 1')
    // Leaving transfers the host rather than ending the other person's call.
    await bob.page.getByRole('button', {name: 'Participantes', exact: true}).click()
    await expect(bob.page.getByRole('button', {name: 'Finalizar para todos'})).toBeVisible()
    bob.page.once('dialog', dialog => void dialog.accept())
    await bob.page.getByRole('button', {name: 'Finalizar para todos'}).click()
    await expect(bob.page).toHaveURL(/\/dashboard/)
    expect(errors).toEqual([])
    await close(alice.context, bob.context)
})

test('phone/tablet layouts and keyboard panels preserve media and avoid overflow', async ({browser}) => {
    const a = await member(browser, 'responsive-a', 'Ana Moreno')
    const b = await member(browser, 'responsive-b', 'Diego Ríos')
    const room = `responsive-${Date.now()}`
    await inMeeting(a.page, room)
    await inMeeting(b.page, room)
    await connected(a.page)
    for (const width of [1440, 768, 390, 320]) {
        await a.page.setViewportSize({width, height: 844})
        await expect.poll(() => a.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await a.page.screenshot({path: `.taste-skill/after-room-${width}.png`})
        await a.page.getByRole('button', {name: 'Chat', exact: true}).click()
        await expect(a.page.locator('.meeting-panel')).toBeVisible()
        await a.page.screenshot({path: `.taste-skill/after-chat-${width}.png`})
        await a.page.keyboard.press('Escape')
        await expect(a.page.locator('.meeting-panel')).toHaveCount(0)
        await expect(a.page.locator('[data-remote-audio]')).toHaveCount(1)
    }
    await a.page.emulateMedia({reducedMotion: 'reduce'})
    await a.page.getByRole('button', {name: 'Imagen', exact: true}).click()
    expect(await a.page.locator('.meeting-panel').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    await close(a.context, b.context)
})

test('audio-only participant keeps distinct presentation slot and is listed immediately', async ({browser}) => {
    const a = await member(browser, 'camera-a', 'Con cámara')
    const b = await member(browser, 'audio-b', 'Solo audio', {audioOnly: true})
    const room = `audio-only-${Date.now()}`
    await inMeeting(a.page, room)
    await inMeeting(b.page, room)
    await expect(a.page.locator('.meeting-tile[data-local=false]')).toHaveAttribute('data-peer-state', 'connected')
    await a.page.getByRole('button', {name: 'Participantes', exact: true}).click()
    await expect(a.page.locator('[data-participant-id=audio-b]')).toHaveAttribute('data-video-muted', 'true')
    await expect(b.page.getByRole('button', {name: 'Activar cámara', exact: true})).toBeDisabled()
    await expect(a.page.locator('[data-remote-audio]')).toHaveCount(1)
    await close(a.context, b.context)
})

test('simultaneous real presentations, pinning, stop and restart preserve the camera and audio', async ({browser}) => {
    const a = await member(browser, 'present-a', 'Presenta Alicia')
    const b = await member(browser, 'present-b', 'Presenta Bruno', {audioOnly: true})
    const room = `present-${Date.now()}`
    await inMeeting(a.page, room)
    await inMeeting(b.page, room)
    await expect(a.page.locator('.meeting-tile[data-local=false]')).toHaveAttribute('data-peer-state', 'connected')
    await Promise.all([a.page.getByRole('button', {name: 'Compartir', exact: true}).click(), b.page.getByRole('button', {name: 'Compartir', exact: true}).click()])
    for (const {page} of [a, b]) {
        await expect(page.locator('.meeting-share-wrap')).toHaveCount(2)
        await expect.poll(async () => page.locator('.meeting-share-wrap video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).videoWidth > 0))).toBe(true)
        await expect(page.locator('[data-remote-audio]')).toHaveCount(1)
    }
    await a.page.screenshot({path: '.taste-skill/after-presentations.png'})
    const late = await member(browser, 'present-late', 'Llega Elena')
    await inMeeting(late.page, room)
    await expect(late.page.locator('.meeting-share-wrap')).toHaveCount(2)
    await expect.poll(() => late.page.locator('.meeting-share-wrap video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).videoWidth > 0))).toBe(true)
    await expect(late.page.locator('[data-remote-audio]')).toHaveCount(2)
    await late.page.getByRole('button', {name: 'Salir', exact: true}).click()
    await expect(a.page.locator('.meeting-strip .meeting-tile')).toHaveCount(2)
    await late.context.close()
    await a.page.getByRole('button', {name: 'Fijar pantalla', exact: true}).last().click()
    await expect(a.page.locator('.meeting-share-wrap')).toHaveCount(1)
    await a.page.getByRole('button', {name: 'Desfijar pantalla', exact: true}).click()
    await expect(a.page.locator('.meeting-share-wrap')).toHaveCount(2)
    await a.page.getByRole('button', {name: 'Dejar de compartir', exact: true}).click()
    await expect(b.page.locator('.meeting-share-wrap')).toHaveCount(1)
    await b.page.getByRole('button', {name: 'Dejar de compartir', exact: true}).click()
    await expect(a.page.locator('.meeting-share-wrap')).toHaveCount(0)
    await connected(b.page)
    await b.page.getByRole('button', {name: 'Compartir', exact: true}).click()
    await expect.poll(() => a.page.locator('.meeting-share-wrap video').evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0)
    await b.page.getByRole('button', {name: 'Dejar de compartir', exact: true}).click()
    for (const {page} of [a, b]) expect(await page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.filter(pc => pc.connectionState !== 'closed').every(pc => pc.getTransceivers().length === 3))).toBe(true)
    await close(a.context, b.context)
})

test('denied devices allow an explicit receive-only join', async ({browser}) => {
    const a = await member(browser, 'receive-a', 'Emisor')
    const b = await member(browser, 'receive-b', 'Sin dispositivos', {noDevices: true})
    const room = `receive-${Date.now()}`
    await inMeeting(a.page, room)
    await b.page.goto(`/room/${room}`)
    await b.page.getByRole('button', {name: 'Entrar sin cámara ni micrófono', exact: true}).click()
    await expect(b.page.locator('.meeting-header-status')).toHaveAttribute('data-status', 'connected')
    await connected(b.page)
    await expect(b.page.getByRole('button', {name: 'Activar micro', exact: true})).toBeDisabled()
    await expect(b.page.getByRole('button', {name: 'Activar cámara', exact: true})).toBeDisabled()
    await close(a.context, b.context)
})

test('guest admission recovers missed database notifications and surfaces rejected/failed requests', async ({browser}) => {
    const host = await member(browser, 'admit-host', 'Anfitriona')
    const guestContext = await browser.newContext({locale: 'es-CO', permissions: ['camera', 'microphone']})
    await guestContext.addInitScript(() => localStorage.setItem('lang', 'es'))
    const room = `admit-${Date.now()}`
    const rows: {id: string; room_id: string; status: string; guest_name: string; created_at: string}[] = []
    let failInsert = true
    for (const context of [host.context, guestContext]) await context.route(`${supabaseUrl}/rest/v1/join_requests*`, async route => {
        const method = route.request().method()
        if (method === 'POST') {
            if (failInsert) return route.fulfill({status: 403, json: {message: 'Test: no se pudo enviar la solicitud'}})
            const row = {...route.request().postDataJSON(), id: crypto.randomUUID(), created_at: new Date().toISOString()}
            rows.push(row)
            return route.fulfill({json: row})
        }
        const url = new URL(route.request().url())
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const row = rows.find(item => item.id === id)
        if (method === 'PATCH' && row) { Object.assign(row, route.request().postDataJSON()); return route.fulfill({json: [{id: row.id}]}) }
        if (id) return route.fulfill({json: row || {}})
        return route.fulfill({json: rows.filter(item => item.status === 'pending')})
    })
    await inMeeting(host.page, room)
    const page = await guestContext.newPage()
    await page.goto(`/room/${room}`)
    await page.getByLabel('Tu nombre', {exact: true}).fill('Invitada Marina')
    await page.getByRole('button', {name: 'Solicitar ingreso', exact: true}).click()
    await expect(page.locator('.meeting-error[role=alert]')).toContainText('no se pudo enviar')
    failInsert = false
    await page.getByRole('button', {name: 'Solicitar ingreso', exact: true}).click()
    await expect(page.getByRole('heading', {name: 'Solicitud enviada'})).toBeVisible()
    await host.page.getByRole('button', {name: 'Participantes', exact: true}).click()
    await host.page.getByRole('button', {name: 'Rechazar', exact: true}).click()
    await expect(page.getByRole('heading', {name: 'Acceso denegado'})).toBeVisible()
    await page.getByRole('button', {name: 'Intentar de nuevo', exact: true}).click()
    await page.getByRole('button', {name: 'Solicitar ingreso', exact: true}).click()
    await host.page.getByRole('button', {name: 'Admitir', exact: true}).click()
    await expect(page.locator('.meeting-header-status')).toHaveAttribute('data-status', 'connected')
    await connected(page)
    await close(host.context, guestContext)
})

test('existing public routes and login validation still work in Spanish and English', async ({browser}) => {
    for (const locale of ['es-CO', 'en-US']) {
        const context = await browser.newContext({locale, viewport: {width: 390, height: 844}})
        const page = await context.newPage()
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        for (const path of ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email?email=preview%40example.test']) {
            const response = await page.goto(path)
            expect(response?.status()).toBe(200)
            await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible()
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
            if (path === '/login') {
                await page.locator('form button[type=submit]').click()
                await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
            }
        }
        expect(errors).toEqual([])
        await context.close()
    }
})

test('background presentation keeps native camera, audio and room events flowing when animation frames stop', async ({browser}) => {
    const sender = await member(browser, 'background-sender', 'Presentadora')
    const receiver = await member(browser, 'background-receiver', 'Receptor')
    try {
        const room = `background-${Date.now()}`
        await inMeeting(sender.page, room)
        await inMeeting(receiver.page, room)
        await connected(sender.page)
        await connected(receiver.page)
        const cameraId = () => sender.page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers
            .find(peer => peer.connectionState === 'connected')!.getTransceivers()[1].sender.track!.id)
        const nativeId = await cameraId()
        await sender.page.getByRole('button', {name: 'Imagen', exact: true}).click()
        await sender.page.getByLabel('Mejorar imagen', {exact: true}).check()
        await expect.poll(cameraId).not.toBe(nativeId)
        const enhancedId = await cameraId()
        await sender.page.getByRole('button', {name: 'Compartir', exact: true}).click()
        await expect(receiver.page.locator('.meeting-share-wrap')).toHaveCount(1)
        await expect.poll(() => receiver.page.locator('.meeting-share-wrap video').evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0)
        // Reproduce the browser's background policy, independently of headless
        // Chromium's visibility/throttling exemptions. Media and signaling remain real.
        await sender.page.evaluate(() => {
            Object.defineProperty(document, 'hidden', {configurable: true, get: () => true})
            Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'})
            const original = window.requestAnimationFrame.bind(window)
            const deferred: FrameRequestCallback[] = []
            Object.assign(window, {__restoreAnimationFrames: () => {
                window.requestAnimationFrame = original
                deferred.splice(0).forEach(callback => original(callback))
            }})
            window.requestAnimationFrame = callback => { deferred.push(callback); return -deferred.length }
            document.dispatchEvent(new Event('visibilitychange'))
        })
        await expect.poll(cameraId).toBe(nativeId)
        const received = () => receiver.page.evaluate(async () => {
            const peer = (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.find(pc => pc.connectionState === 'connected')!
            const totals = {camera: 0, screen: 0, audio: 0}
            const transceivers = peer.getTransceivers()
            ;(await peer.getStats()).forEach(report => {
                if (report.type !== 'inbound-rtp') return
                if (report.kind === 'audio') totals.audio += report.bytesReceived || 0
                if (report.mid === transceivers[1].mid) totals.camera += report.framesDecoded || 0
                if (report.mid === transceivers[2].mid) totals.screen += report.framesDecoded || 0
            })
            return totals
        })
        const before = await received()
        await expect.poll(async () => {
            const after = await received()
            return after.camera > before.camera + 10 && after.screen > before.screen + 5 && after.audio > before.audio
        }).toBe(true)
        await receiver.page.getByRole('button', {name: 'Participantes', exact: true}).click()
        await sender.page.getByRole('button', {name: 'Levantar mano', exact: true}).click()
        await expect(receiver.page.locator('[data-participant-id=background-sender]')).toHaveAttribute('data-hand-raised', 'true')
        for (const {page} of [sender, receiver]) await page.getByRole('button', {name: 'Chat', exact: true}).click()
        await sender.page.getByLabel('Escribe un mensaje', {exact: true}).fill('La llamada continúa en segundo plano')
        await sender.page.getByRole('button', {name: 'Enviar mensaje', exact: true}).click()
        await expect(receiver.page.locator('.meeting-message p')).toHaveText('La llamada continúa en segundo plano')
        await receiver.page.getByLabel('Escribe un mensaje', {exact: true}).fill('Mensaje recibido mientras la otra pestaña está oculta')
        await receiver.page.getByRole('button', {name: 'Enviar mensaje', exact: true}).click()
        await expect(sender.page.locator('.meeting-message')).toHaveCount(2)
        await sender.page.evaluate(() => {
            delete (document as unknown as {hidden?: boolean}).hidden
            delete (document as unknown as {visibilityState?: string}).visibilityState
            ;(window as unknown as {__restoreAnimationFrames: () => void}).__restoreAnimationFrames()
            document.dispatchEvent(new Event('visibilitychange'))
        })
        await expect.poll(cameraId).toBe(enhancedId)
        const foreground = await received()
        await expect.poll(async () => (await received()).camera > foreground.camera + 10).toBe(true)
        await sender.page.getByRole('button', {name: 'Apagar cámara', exact: true}).click()
        await sender.page.evaluate(() => {
            Object.defineProperty(document, 'hidden', {configurable: true, get: () => true})
            document.dispatchEvent(new Event('visibilitychange'))
        })
        await expect.poll(cameraId).toBe(nativeId)
        expect(await sender.page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers
            .find(peer => peer.connectionState === 'connected')!.getTransceivers()[1].sender.track!.enabled)).toBe(false)
        for (const {page} of [sender, receiver]) expect(await page.evaluate(() => (window as unknown as {__meetingPeers: RTCPeerConnection[]}).__meetingPeers.length)).toBe(1)
    } finally {
        await close(sender.context, receiver.context)
    }
})
