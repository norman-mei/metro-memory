import { clearSessionCookie, getCurrentUser, normalizeEmail } from '@/lib/auth'

function getAutomationAdminAllowedEmails() {
  const values = [
    process.env.AUTOMATION_ADMIN_ALLOWED_EMAIL || '',
    process.env.AUTOMATION_ADMIN_ALLOWED_EMAILS || '',
  ]

  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => normalizeEmail(value)),
    ),
  )
}

export function isAutomationAdminConfigured() {
  return getAutomationAdminAllowedEmails().length > 0
}

export async function getAutomationAdminUser() {
  const user = await getCurrentUser()
  if (!user) return null

  const allowedEmails = getAutomationAdminAllowedEmails()
  const email = normalizeEmail(user.email)
  if (!allowedEmails.includes(email)) {
    return null
  }

  return user
}

export async function clearAutomationAdminSession() {
  await clearSessionCookie()
}

export async function isAutomationAdminAuthenticated() {
  return Boolean(await getAutomationAdminUser())
}

export async function getAutomationReviewerLabel() {
  const user = await getAutomationAdminUser()
  if (user?.email) return normalizeEmail(user.email)
  return process.env.AUTOMATION_ADMIN_LABEL?.trim() || 'automation-admin'
}
