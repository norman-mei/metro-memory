const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function getEnv(name: string) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function isLocalUrl(url: URL) {
  return LOCAL_HOSTNAMES.has(url.hostname)
}

export function getAuthBaseUrl() {
  const rawBaseUrl = getEnv('APP_BASE_URL') ?? getEnv('NEXT_PUBLIC_BASE_URL')

  if (!rawBaseUrl) {
    throw new Error(
      'APP_BASE_URL is missing. Set it to the public site URL so auth emails can generate valid links.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(rawBaseUrl)
  } catch {
    throw new Error(
      `APP_BASE_URL is invalid: ${rawBaseUrl}. Use a full https:// URL for the public site.`,
    )
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(
      `APP_BASE_URL must use http or https. Received protocol ${parsed.protocol}.`,
    )
  }

  if (process.env.NODE_ENV === 'production' && isLocalUrl(parsed)) {
    throw new Error(
      `APP_BASE_URL must not point to localhost in production. Received ${rawBaseUrl}.`,
    )
  }

  return parsed
}

export function assertMailerEnvironment() {
  const missing = ['BREVO_HOST', 'BREVO_USER', 'BREVO_PASS', 'MAIL_FROM_EMAIL'].filter(
    (name) => !getEnv(name),
  )

  if (missing.length > 0) {
    throw new Error(
      `Auth email configuration is incomplete. Missing: ${missing.join(', ')}.`,
    )
  }

  getAuthBaseUrl()
}

export function getProductionAuthEnvironmentIssues() {
  const issues: string[] = []
  const databaseUrl = getEnv('DATABASE_URL')

  if (!databaseUrl) {
    issues.push('DATABASE_URL is missing.')
  } else if (databaseUrl.startsWith('file:')) {
    issues.push('DATABASE_URL still points to file-based SQLite.')
  } else if (!databaseUrl.startsWith('postgres')) {
    issues.push('DATABASE_URL is not a PostgreSQL connection string.')
  }

  try {
    getAuthBaseUrl()
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error))
  }

  const missingEmailEnv = ['BREVO_HOST', 'BREVO_USER', 'BREVO_PASS', 'MAIL_FROM_EMAIL'].filter(
    (name) => !getEnv(name),
  )

  if (missingEmailEnv.length > 0) {
    issues.push(`Email env is incomplete: ${missingEmailEnv.join(', ')}.`)
  }

  return issues
}
