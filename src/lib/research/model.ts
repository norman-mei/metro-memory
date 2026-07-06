// OpenAI-compatible chat-completions helper for the research engine.
// Env-gated: disabled (returns null) unless both an API key and a model are set,
// mirroring the pattern the old system used in src/lib/automationAgentModel.ts.

type JsonRecord = Record<string, any>

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
 * Calls the configured LLM with a strict-JSON response format and returns the
 * parsed object, or null on any failure (disabled, HTTP error, invalid JSON).
 * Callers must always handle the null case and fall back to heuristics.
 */
export async function callResearchModel(
  schemaName: string,
  system: string,
  user: string,
): Promise<JsonRecord | null> {
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
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${system}\nReturn a single JSON object only. Schema name: ${schemaName}.`,
          },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const payload = (await response.json().catch(() => null)) as JsonRecord | null
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) return null

    try {
      return JSON.parse(content) as JsonRecord
    } catch {
      return null
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
