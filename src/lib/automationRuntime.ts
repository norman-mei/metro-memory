type AutomationObservationLevel = 'info' | 'warn' | 'error'

type AutomationObservation = {
  at: string
  level: AutomationObservationLevel
  code: string
  message: string
  metadata?: Record<string, any>
}

type AutomationRuntimeState = {
  label: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  domainFetchCounts: Record<string, number>
  researchTasksConsumed: number
  artifactsPersisted: number
  citationsPersisted: number
  fetchAttempts: number
  fetchFailures: number
  modelCalls: number
  modelFailures: number
  queueDispatches: number
  queueFailures: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedSpendUsd: number | null
  observations: AutomationObservation[]
  metadata?: Record<string, any>
}

declare global {
  var __METRO_MEMORY_AUTOMATION_RUNTIME__: AutomationRuntimeState | undefined
}

const DEFAULT_MODEL_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'gpt-5.4': { input: 2.5, output: 15 },
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
}

function getState() {
  if (!globalThis.__METRO_MEMORY_AUTOMATION_RUNTIME__) {
    globalThis.__METRO_MEMORY_AUTOMATION_RUNTIME__ = {
      label: 'automation',
      startedAt: new Date().toISOString(),
      domainFetchCounts: {},
      researchTasksConsumed: 0,
      artifactsPersisted: 0,
      citationsPersisted: 0,
      fetchAttempts: 0,
      fetchFailures: 0,
      modelCalls: 0,
      modelFailures: 0,
      queueDispatches: 0,
      queueFailures: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedSpendUsd: 0,
      observations: [],
    }
  }
  return globalThis.__METRO_MEMORY_AUTOMATION_RUNTIME__
}

function parsePositiveInt(value: string | undefined) {
  const parsed = Number(value || '')
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

function normalizeModelName(model: string | undefined | null) {
  return String(model || '').trim().toLowerCase()
}

function estimateTokensFromText(text: string | null | undefined) {
  const value = String(text || '')
  if (!value) return 0
  return Math.max(1, Math.ceil(value.length / 4))
}

function getModelPricing(model: string | undefined | null) {
  const normalized = normalizeModelName(model)
  const inputOverride = Number(process.env.AUTOMATION_LLM_INPUT_COST_PER_1M || '')
  const outputOverride = Number(process.env.AUTOMATION_LLM_OUTPUT_COST_PER_1M || '')

  if (Number.isFinite(inputOverride) && Number.isFinite(outputOverride)) {
    return {
      input: inputOverride,
      output: outputOverride,
    }
  }

  return DEFAULT_MODEL_PRICING_PER_1M[normalized] || null
}

export function getAutomationRuntimeCaps() {
  return {
    maxCitiesPerRun: parsePositiveInt(process.env.METRO_SYNC_MAX_CITIES_PER_RUN),
    maxResearchTasksPerRun: parsePositiveInt(process.env.METRO_SYNC_MAX_RESEARCH_TASKS_PER_RUN),
    maxResearchRunsPerClaim:
      parsePositiveInt(process.env.METRO_SYNC_MAX_RESEARCH_RUN_ATTEMPTS_PER_CLAIM) || 4,
    maxFetchesPerDomain: parsePositiveInt(process.env.METRO_SYNC_MAX_FETCHES_PER_DOMAIN),
    timeoutCeilingMs: parsePositiveInt(process.env.AUTOMATION_TIMEOUT_CEILING_MS),
    llmTimeoutMs: parsePositiveInt(process.env.AUTOMATION_LLM_TIMEOUT_MS) || 45000,
    httpTimeoutMs: parsePositiveInt(process.env.METRO_SYNC_HTTP_TIMEOUT_MS) || 20000,
  }
}

export function resetAutomationRuntime(label: string, metadata?: Record<string, any>) {
  globalThis.__METRO_MEMORY_AUTOMATION_RUNTIME__ = {
    label,
    startedAt: new Date().toISOString(),
    domainFetchCounts: {},
    researchTasksConsumed: 0,
    artifactsPersisted: 0,
    citationsPersisted: 0,
    fetchAttempts: 0,
    fetchFailures: 0,
    modelCalls: 0,
    modelFailures: 0,
    queueDispatches: 0,
    queueFailures: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedSpendUsd: 0,
    observations: [],
    metadata,
  }
  return getState()
}

export function recordAutomationObservation(
  level: AutomationObservationLevel,
  code: string,
  message: string,
  metadata?: Record<string, any>,
) {
  const state = getState()
  state.observations.push({
    at: new Date().toISOString(),
    level,
    code,
    message,
    ...(metadata ? { metadata } : {}),
  })
  if (state.observations.length > 100) {
    state.observations = state.observations.slice(-100)
  }
}

export function applyAutomationTimeoutCeiling(requestedMs: number, fallbackMs = 30000) {
  const safeRequested =
    Number.isFinite(requestedMs) && requestedMs > 0 ? Math.trunc(requestedMs) : fallbackMs
  const { timeoutCeilingMs } = getAutomationRuntimeCaps()
  if (!timeoutCeilingMs) return safeRequested
  return Math.min(safeRequested, timeoutCeilingMs)
}

export function tryConsumeDomainFetchBudget(input: {
  domain?: string | null
  url?: string | null
  reason?: string
}) {
  const domain = String(input.domain || '').trim().toLowerCase()
  const { maxFetchesPerDomain } = getAutomationRuntimeCaps()
  const state = getState()

  if (!domain) {
    return true
  }

  const nextCount = (state.domainFetchCounts[domain] || 0) + 1
  if (maxFetchesPerDomain && nextCount > maxFetchesPerDomain) {
    recordAutomationObservation(
      'warn',
      'domain_fetch_cap_reached',
      `Skipped fetch because the per-domain fetch cap was reached for ${domain}.`,
      {
        domain,
        url: input.url || null,
        maxFetchesPerDomain,
        reason: input.reason || null,
      },
    )
    return false
  }

  state.domainFetchCounts[domain] = nextCount
  return true
}

export function tryConsumeResearchTaskBudget(count = 1, metadata?: Record<string, any>) {
  const { maxResearchTasksPerRun } = getAutomationRuntimeCaps()
  const state = getState()
  if (
    maxResearchTasksPerRun &&
    state.researchTasksConsumed + count > maxResearchTasksPerRun
  ) {
    recordAutomationObservation(
      'warn',
      'research_task_cap_reached',
      'Skipped research tasks because the per-run task cap was reached.',
      {
        maxResearchTasksPerRun,
        requestedCount: count,
        consumed: state.researchTasksConsumed,
        ...(metadata || {}),
      },
    )
    return false
  }

  state.researchTasksConsumed += count
  return true
}

export function recordAutomationFetchResult(input: {
  domain?: string | null
  success: boolean
  kind: string
  durationMs?: number
  metadata?: Record<string, any>
}) {
  const state = getState()
  state.fetchAttempts += 1
  if (!input.success) {
    state.fetchFailures += 1
    recordAutomationObservation(
      'warn',
      'fetch_failure',
      `Fetch failed during ${input.kind}.`,
      {
        domain: input.domain || null,
        durationMs: input.durationMs || null,
        ...(input.metadata || {}),
      },
    )
  }
}

export function recordArtifactsPersisted(count: number) {
  const state = getState()
  state.artifactsPersisted += Math.max(0, count)
}

export function recordCitationsPersisted(count: number) {
  const state = getState()
  state.citationsPersisted += Math.max(0, count)
}

export function recordQueueDispatch(input: {
  success: boolean
  mode: string
  durationMs?: number
  metadata?: Record<string, any>
}) {
  const state = getState()
  state.queueDispatches += 1
  if (!input.success) {
    state.queueFailures += 1
    recordAutomationObservation(
      'error',
      'queue_dispatch_failure',
      `Queue dispatch failed using ${input.mode}.`,
      {
        durationMs: input.durationMs || null,
        ...(input.metadata || {}),
      },
    )
  }
}

export function recordModelCall(input: {
  operation: string
  model: string
  success: boolean
  inputTokens?: number | null
  outputTokens?: number | null
  inputText?: string | null
  outputText?: string | null
  durationMs?: number
  error?: string | null
}) {
  const state = getState()
  state.modelCalls += 1

  const inputTokens =
    typeof input.inputTokens === 'number'
      ? input.inputTokens
      : estimateTokensFromText(input.inputText)
  const outputTokens =
    typeof input.outputTokens === 'number'
      ? input.outputTokens
      : estimateTokensFromText(input.outputText)

  state.estimatedInputTokens += Math.max(0, inputTokens)
  state.estimatedOutputTokens += Math.max(0, outputTokens)

  const pricing = getModelPricing(input.model)
  if (pricing && state.estimatedSpendUsd !== null) {
    const inputCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.input
    const outputCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.output
    state.estimatedSpendUsd += inputCost + outputCost
  } else {
    state.estimatedSpendUsd = null
  }

  if (!input.success) {
    state.modelFailures += 1
    recordAutomationObservation(
      'warn',
      'model_failure',
      `Model call failed during ${input.operation}.`,
      {
        model: input.model,
        durationMs: input.durationMs || null,
        error: input.error || null,
      },
    )
  }
}

export function getAutomationRuntimeSnapshot() {
  return JSON.parse(JSON.stringify(getState())) as AutomationRuntimeState
}

export function finalizeAutomationRuntime(extra?: Record<string, any>) {
  const state = getState()
  const finishedAt = new Date().toISOString()
  const durationMs = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(state.startedAt).getTime(),
  )
  state.finishedAt = finishedAt
  state.durationMs = durationMs
  return {
    ...getAutomationRuntimeSnapshot(),
    ...(extra ? { extra } : {}),
  }
}
