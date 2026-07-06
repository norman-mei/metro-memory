// Lightweight web-search + page-fetch helpers for the research engine.
// Uses SERPAPI (same provider the old system used) via fetch, and a minimal
// HTML-to-text extractor. All network calls are timeout-bounded and fail soft.

export type SearchResult = {
  title: string
  url: string
  snippet: string
  date: string | null
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, done: () => clearTimeout(timeout) }
}

/**
 * Runs a Google search via SERPAPI and returns organic results.
 * Returns [] when SERPAPI_API_KEY is unset or the request fails.
 */
export async function searchWeb(query: string, limit = 8): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim()
  if (!apiKey) return []

  const params = new URLSearchParams({ engine: 'google', q: query, api_key: apiKey, num: String(limit) })
  const t = withTimeout(20000)
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      signal: t.signal,
    })
    if (!res.ok) return []
    const data = (await res.json().catch(() => null)) as any
    const organic = Array.isArray(data?.organic_results) ? data.organic_results : []
    return organic.slice(0, limit).map(
      (r: any): SearchResult => ({
        title: String(r?.title || ''),
        url: String(r?.link || ''),
        snippet: String(r?.snippet || ''),
        date: typeof r?.date === 'string' ? r.date : null,
      }),
    ).filter((r: SearchResult) => r.url)
  } catch {
    return []
  } finally {
    t.done()
  }
}

/**
 * Fetches a URL and returns readable text (scripts/styles stripped, tags removed,
 * whitespace collapsed), truncated to `maxChars`. Returns '' on failure.
 */
export async function fetchPageText(url: string, maxChars = 12000): Promise<string> {
  const t = withTimeout(20000)
  try {
    const res = await fetch(url, {
      signal: t.signal,
      headers: { 'User-Agent': 'MetroMemoryResearchBot/2.0 (+https://metro-memory)' },
    })
    if (!res.ok) return ''
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('html') && !contentType.includes('text')) return ''
    const html = await res.text()
    return htmlToText(html).slice(0, maxChars)
  } catch {
    return ''
  } finally {
    t.done()
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
