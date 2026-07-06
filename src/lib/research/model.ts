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
  if (!config.enabled) return null

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
    if (!response.ok) return null
    const payload = (await response.json().catch(() => null)) as JsonRecord | null
    const content = payload?.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim() ? content : null
  } catch {
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
