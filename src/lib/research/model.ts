// OpenAI-compatible chat-completions helpers for the research engine.
// Env-gated: disabled (returns null) unless both an API key and a model are set,
// mirroring the pattern the old system used in src/lib/automationAgentModel.ts.

type JsonRecord = Record<string, any>

export type ModelMessage = { role: 'system' | 'user' | 'assistant'; content: string }

function getModelConfig() {
  const apiKey =
    process.env.AUTOMATION_LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || ''
  const baseUrl = (process.env.AUTOMATION_LLM_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = process.env.AUTOMATION_LLM_MODEL?.trim() || ''
  const timeoutMs = Number(process.env.AUTOMATION_LLM_TIMEOUT_MS) || 45000
  return {
    enabled: Boolean(apiKey && model),
    apiKey,
    baseUrl,
    model,
    timeoutMs: Math.min(Math.max(timeoutMs, 5000), 120000),
  }
}

export function isResearchModelEnabled(): boolean {
  return getModelConfig().enabled
}

/**
 * Low-level call: posts a message array and returns the raw assistant string,
 * or null on any failure. When `json` is true, requests a JSON-object response.
 */
async function postCompletion(messages: ModelMessage[], json: boolean): Promise<string | null> {
  const config = getModelConfig()
  if (!config.enabled) {
    console.warn(
      `[research-model] disabled — apiKey:${config.apiKey ? 'set' : 'MISSING'} model:${
        config.model ? config.model : 'MISSING'
      }`,
    )
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: json ? 0.1 : 0.4,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.warn(`[research-model] HTTP ${response.status} from ${config.baseUrl}: ${body.slice(0, 300)}`)
      return null
    }
    const payload = (await response.json().catch(() => null)) as JsonRecord | null
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      console.warn('[research-model] empty response content')
      return null
    }
    return content
  } catch (error) {
    console.warn(`[research-model] request failed: ${error instanceof Error ? error.message : error}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Single-turn strict-JSON call (system + user). Returns the parsed object, or null
 * on any failure. Callers must handle null and fall back to heuristics.
 */
export async function callResearchModel(
  schemaName: string,
  system: string,
  user: string,
): Promise<JsonRecord | null> {
  const raw = await postCompletion(
    [
      {
        role: 'system',
        content: `${system}\nReturn a single JSON object only. Schema name: ${schemaName}.`,
      },
      { role: 'user', content: user },
    ],
    true,
  )
  if (!raw) return null
  try {
    return JSON.parse(raw) as JsonRecord
  } catch {
    return null
  }
}

/**
 * Multi-turn strict-JSON call over a full message history (for the conversational
 * agent). Returns the parsed object, or null on failure.
 */
export async function callResearchModelJson(messages: ModelMessage[]): Promise<JsonRecord | null> {
  const raw = await postCompletion(messages, true)
  if (!raw) return null
  try {
    return JSON.parse(raw) as JsonRecord
  } catch {
    return null
  }
}

/**
 * Streams a plain-text completion, invoking `onDelta` for each token chunk as it
 * arrives. Returns the full accumulated text, or null if disabled / the request
 * fails before any content. Parses the OpenAI-style Server-Sent Events format.
 */
export async function streamResearchModel(
  messages: ModelMessage[],
  onDelta: (text: string) => void,
  options: { signal?: AbortSignal } = {},
): Promise<string | null> {
  const config = getModelConfig()
  if (!config.enabled) {
    console.warn(
      `[research-model] stream disabled — apiKey:${config.apiKey ? 'set' : 'MISSING'} model:${
        config.model || 'MISSING'
      }`,
    )
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  // Abort the upstream request as soon as the caller (e.g. a disconnected
  // client) aborts, so we stop reading the model stream instead of running it
  // to the timeout ceiling.
  const external = options.signal
  const onExternalAbort = () => controller.abort()
  if (external) {
    if (external.aborted) controller.abort()
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: config.model, temperature: 0.4, stream: true, messages }),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) {
      const body = response.ok ? '' : await response.text().catch(() => '')
      console.warn(`[research-model] stream HTTP ${response.status}: ${body.slice(0, 300)}`)
      return null
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta) {
            full += delta
            onDelta(delta)
          }
        } catch {
          // ignore keep-alive / non-JSON lines
        }
      }
    }
    return full || null
  } catch (error) {
    console.warn(`[research-model] stream failed: ${error instanceof Error ? error.message : error}`)
    return null
  } finally {
    clearTimeout(timeout)
    external?.removeEventListener('abort', onExternalAbort)
  }
}
