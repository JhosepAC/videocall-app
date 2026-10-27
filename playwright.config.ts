import {defineConfig} from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    expect: {timeout: 15000},
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
        channel: process.env.E2E_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium'),
        headless: true,
        locale: 'es-CO',
        viewport: {width: 1440, height: 900},
        launchOptions: {args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--enable-usermedia-screen-capturing']},
        permissions: ['camera', 'microphone'],
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
})
