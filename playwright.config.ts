import { defineConfig } from '@playwright/test'

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.APP_BASE_URL?.trim() ||
  'http://127.0.0.1:3000'

function shouldStartLocalServer() {
  if (process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1') return false

  try {
    const hostname = new URL(baseURL).hostname
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(hostname)
  } catch {
    return false
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: shouldStartLocalServer()
    ? {
        command: 'npm run dev',
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
})
