import { kv } from '@vercel/kv'

let hasWarnedAboutKvConfig = false

const isKvConfigured = () => {
  const restUrl = process.env.KV_REST_API_URL?.trim()
  const restToken = process.env.KV_REST_API_TOKEN?.trim()

  if (!restUrl || !restToken) {
    return false
  }

  if (restUrl.includes('<region>') || restToken.includes('<vercel-kv-token>')) {
    return false
  }

  try {
    const parsedUrl = new URL(restUrl)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
  } catch {
    return false
  }
}

const warnAboutKvConfig = () => {
  if (hasWarnedAboutKvConfig) {
    return
  }

  hasWarnedAboutKvConfig = true
  console.warn(
    'Skipping /api/count writes because Vercel KV is not configured with a real KV_REST_API_URL/KV_REST_API_TOKEN.',
  )
}

export const POST = async (req: Request) => {
  const body = await req.json().catch(() => null)
  const matches = Array.isArray(body?.matches)
    ? body.matches.filter(
        (match: unknown): match is string => typeof match === 'string' && match.length > 0,
      )
    : []

  if (matches.length === 0) {
    return new Response('OK')
  }

  if (!isKvConfigured()) {
    warnAboutKvConfig()
    return new Response('OK')
  }

  try {
    await Promise.all(
      matches.map(async (match: string) => {
        await kv.incr(`${match}`)
      }),
    )
  } catch (error) {
    console.warn('Unable to persist /api/count metrics to Vercel KV:', error)
  }

  return new Response('OK')
}
