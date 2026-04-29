import { readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const captureDir = process.env.AUTH_EMAIL_CAPTURE_DIR?.trim()

async function listCaptureFiles() {
  if (!captureDir) return []
  const entries = await readdir(captureDir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(captureDir, entry.name))
}

async function resetCaptureDir() {
  if (!captureDir) return
  const files = await listCaptureFiles()
  await Promise.all(files.map((file) => rm(file, { force: true })))
}

async function readLatestVerificationUrl() {
  const files = await listCaptureFiles()
  const latest = files.sort().at(-1)
  if (!latest) return null

  const payload = JSON.parse(await readFile(latest, 'utf8')) as {
    html?: string
    text?: string
  }

  const blob = `${payload.text ?? ''}\n${payload.html ?? ''}`
  const match = blob.match(/https?:\/\/[^\s"'<>]+\/api\/auth\/verify-email[^\s"'<>]*/)
  return match?.[0] ?? null
}

function isLocalBaseUrl(baseURL: string | undefined) {
  if (!baseURL) return false

  try {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(baseURL).hostname)
  } catch {
    return false
  }
}

test.describe('local auth flow', () => {
  test('signup, verify, and login works with captured email delivery', async ({
    page,
    baseURL,
  }) => {
    test.skip(!captureDir, 'AUTH_EMAIL_CAPTURE_DIR is not configured.')
    test.skip(!isLocalBaseUrl(baseURL), 'This test is intended for a local app server only.')

    const email = `playwright-${Date.now().toString(36)}@example.com`
    const password = 'MetroMemory!123'

    await resetCaptureDir()

    await page.goto('/account')
    await page.getByTestId('account-switch-create').click()

    await expect(page.getByTestId('account-create-form')).toBeVisible()
    await page.locator('#email').fill(email)
    await page.locator('#confirm-email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#confirm-password').fill(password)
    await page.getByTestId('account-create-submit').click()

    await expect(page.getByTestId('account-resend-verification')).toBeVisible()

    await expect
      .poll(async () => Boolean(await readLatestVerificationUrl()), {
        timeout: 15_000,
        message: 'Expected a captured verification email.',
      })
      .toBe(true)

    const verifyUrl = await readLatestVerificationUrl()
    expect(verifyUrl).not.toBeNull()

    await page.goto(verifyUrl!)
    await expect(page).toHaveURL(/verified=success/)

    await page.goto('/account')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByTestId('account-login-submit').click()

    await expect(page.getByTestId('account-authenticated-panel')).toBeVisible()
    await expect(page.getByText(email, { exact: false })).toBeVisible()
  })
})
