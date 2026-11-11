import {test, expect} from '@playwright/test'
import type {Browser, BrowserContext, Page} from '@playwright/test'
import {readFileSync} from 'node:fs'

const env = readFileSync('.env', 'utf8')
const supabaseUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL=['"]?([^\s'"]+)/m)![1]
const project = new URL(supabaseUrl).hostname.split('.')[0]
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
const origin = new URL(baseURL).origin
const host = new URL(baseURL).hostname

const PORTFOLIO = 'https://jhosep-ac.pages.dev'
const LOOKALIKE = 'https://jhosep-ac.pages.dev.ejemplo.com/proyectos/meetmesh'

function dialog(page: Page) {
    return page.getByRole('dialog')
}

async function openFromPortfolio(page: Page, path = '/') {
    await page.goto(`${path}`, {referer: `${PORTFOLIO}/proyectos/meetmesh`})
}

async function enterAsGuest(page: Page) {
    await expect(dialog(page)).toBeVisible()
    await page.getByRole('button', {name: 'Ingresar como invitado'}).click()
    await expect(page).toHaveURL(/\/dashboard$/)
}

async function guestContext(browser: Browser): Promise<{context: BrowserContext; page: Page}> {
    const context = await browser.newContext({
        locale: 'es-CO',
        viewport: {width: 1440, height: 900},
        permissions: ['camera', 'microphone'],
    })
    const page = await context.newPage()
    return {context, page}
}

async function authenticatedContext(browser: Browser): Promise<{context: BrowserContext; page: Page}> {
    const context = await browser.newContext({locale: 'es-CO'})
    const user = {
        id: 'guest-test-member',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'member@example.test',
        app_metadata: {},
        user_metadata: {full_name: 'Cuenta Real'},
        created_at: new Date().toISOString(),
    }
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const token = `${encode({alg: 'HS256', typ: 'JWT'})}.${encode({sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated'})}.test-signature`
    await context.addInitScript(({project, user, token}) => {
        const session = JSON.stringify({
            access_token: token,
            refresh_token: 'fixture-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: 'bearer',
            user,
        })
        document.cookie = `sb-${project}-auth-token=base64-${btoa(unescape(encodeURIComponent(session))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}; path=/; SameSite=Lax`
    }, {project, user, token})
    await context.route(`${supabaseUrl}/auth/v1/**`, route => route.fulfill({json: user}))
    await context.route(`${supabaseUrl}/rest/v1/profiles*`, route => route.fulfill({json: {id: user.id, full_name: 'Cuenta Real', username: 'cuenta', avatar_url: null}}))
    const page = await context.newPage()
    return {context, page}
}

test.describe('portfolio referral detection', () => {
    test('shows the welcome modal from the portfolio referrer and does not repeat', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await openFromPortfolio(page)

        await expect(dialog(page)).toBeVisible()
        await expect(page.getByRole('heading', {name: '¡Bienvenido a MeetMesh!'})).toBeVisible()
        await expect(page.getByRole('button', {name: 'Ingresar como invitado'})).toBeVisible()

        await page.getByRole('button', {name: 'Ahora no'}).click()
        await expect(dialog(page)).toHaveCount(0)

        await page.reload()
        await page.waitForTimeout(600)
        await expect(dialog(page)).toHaveCount(0)

        await context.close()
    })

    test('shows the modal from any portfolio subroute', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await page.goto('/', {referer: `${PORTFOLIO}/cualquier/ruta/anidada`})
        await expect(dialog(page)).toBeVisible()
        await context.close()
    })

    test('supports the source parameter as a referral signal', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await page.goto('/?source=portfolio')
        await expect(dialog(page)).toBeVisible()
        await context.close()
    })

    test('does not show the modal for lookalike domains, other sites or direct visits', async ({browser}) => {
        const {context, page} = await guestContext(browser)

        await page.goto('/', {referer: LOOKALIKE})
        await page.waitForTimeout(700)
        await expect(dialog(page)).toHaveCount(0)

        await page.goto('/', {referer: 'https://example.com/blog'})
        await page.waitForTimeout(700)
        await expect(dialog(page)).toHaveCount(0)

        await page.goto('/')
        await page.waitForTimeout(700)
        await expect(dialog(page)).toHaveCount(0)

        await page.goto('/?source=newsletter')
        await page.waitForTimeout(700)
        await expect(dialog(page)).toHaveCount(0)

        await context.close()
    })

    test('does not offer guest access to an authenticated visitor', async ({browser}) => {
        const {context, page} = await authenticatedContext(browser)
        // The server cannot see the fixture token, so this test isolates the
        // client decision: an authenticated session suppresses the offer.
        await context.route('**/api/guest/session', route => route.fulfill({json: {authenticated: true, guest: null}}))
        await page.goto('/?source=portfolio')
        await page.waitForTimeout(900)
        await expect(dialog(page)).toHaveCount(0)
        await context.close()
    })
})

test.describe('guest session', () => {
    test('creates a real session, persists it and protects settings', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await openFromPortfolio(page)
        await enterAsGuest(page)

        await expect(page.getByText('Estás explorando como invitado')).toBeVisible()
        await expect(page.getByRole('navigation').getByText('Invitado', {exact: true})).toBeVisible()

        const session = await page.request.get(`${baseURL}/api/guest/session`)
        expect(session.ok()).toBe(true)
        const body = await session.json()
        expect(body.guest.accountType).toBe('guest')
        expect(body.guest.displayName).toBe('Invitado de MeetMesh')
        expect(body.guest.origin).toBe('portfolio')
        expect(body.guest.id).toBeTruthy()
        expect(body.guest.sessionId).toBeTruthy()
        expect(body.guest.permissions.allowed).toContain('room.create')
        expect(body.guest.permissions.denied).toContain('profile.edit')

        await page.reload()
        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByText('Estás explorando como invitado')).toBeVisible()

        await page.goto('/settings')
        await expect(page.getByRole('heading', {name: 'Esta zona requiere una cuenta'})).toBeVisible()
        await expect(page.getByRole('link', {name: /Crear cuenta/})).toBeVisible()
        await expect(page.getByText('Esta funcionalidad requiere una cuenta. Regístrate para disfrutar de la experiencia completa de MeetMesh.')).toBeVisible()

        await context.close()
    })

    test('can start a room as a guest', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await openFromPortfolio(page)
        await enterAsGuest(page)

        await page.getByRole('button', {name: 'Iniciar ahora'}).click()
        await expect(page).toHaveURL(/\/room\//)
        await expect(page.locator('.meeting-guest-badge')).toHaveText('Invitado')

        await context.close()
    })

    test('closes the guest session from the dashboard', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await openFromPortfolio(page)
        await enterAsGuest(page)

        await page.getByRole('button', {name: 'Cerrar sesión de invitado'}).click()
        await page.waitForURL(url => new URL(url).pathname === '/')

        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/login$/)

        await context.close()
    })

    test('rejects direct session creation without a referral', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        const response = await page.request.post(`${baseURL}/api/guest/session`, {
            headers: {Origin: origin},
            data: {},
        })
        expect(response.status()).toBe(403)
        expect((await response.json()).error).toBe('not_referred')
        await context.close()
    })

    test('rejects cross-origin session creation', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        const response = await page.request.post(`${baseURL}/api/guest/session`, {
            headers: {Origin: 'https://evil.example'},
            data: {source: 'portfolio'},
        })
        expect(response.status()).toBe(403)
        expect((await response.json()).error).toBe('forbidden_origin')
        await context.close()
    })

    test('clears a tampered guest cookie', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await context.addCookies([{name: 'mm_guest_session', value: 'tampered.value', domain: host, path: '/'}])

        const response = await page.request.get(`${baseURL}/api/guest/session`)
        expect(response.ok()).toBe(true)
        const body = await response.json()
        expect(body.guest).toBeNull()
        expect(body.expired).toBe(true)

        const cookies = await context.cookies()
        expect(cookies.find(cookie => cookie.name === 'mm_guest_session')).toBeUndefined()

        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/login$/)
        await context.close()
    })

    test('shows the modal on a phone viewport', async ({browser}) => {
        const context = await browser.newContext({
            locale: 'es-CO',
            viewport: {width: 390, height: 844},
            permissions: ['camera', 'microphone'],
        })
        const page = await context.newPage()
        await openFromPortfolio(page)
        await expect(dialog(page)).toBeVisible()
        await expect(page.getByRole('button', {name: 'Ingresar como invitado'})).toBeVisible()
        await page.getByRole('button', {name: 'Prefiero registrarme'}).click()
        await expect(page).toHaveURL(/\/register$/)
        await context.close()
    })

    test('dismisses with Escape without breaking the page', async ({browser}) => {
        const {context, page} = await guestContext(browser)
        await openFromPortfolio(page)
        await expect(dialog(page)).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(dialog(page)).toHaveCount(0)
        await expect(page.locator('h1').first()).toBeVisible()
        await context.close()
    })
})
