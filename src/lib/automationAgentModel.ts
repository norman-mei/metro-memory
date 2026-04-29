import { AVAILABLE_CITY_SLUGS } from './availableCityData.ts'
import {
  applyAutomationTimeoutCeiling,
  getAutomationRuntimeCaps,
  recordModelCall,
} from './automationRuntime.ts'

import type {
  CollectedArtifact,
  ExtractedArtifactFact,
  GroundedFactExtractionResult,
  GroundedVerificationResult,
  ResearchPlannerOutput,
  ResearchTaskType,
  ReviewCandidate,
} from '../../scripts/metro-sync/types'

type JsonRecord = Record<string, any>

function hashExcerpt(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return `h${hash.toString(16)}`
}

export type ParsedAutomationOperatorAction = {
  mode: 'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN'
  citySlugs: string[]
  claimTypes: string[]
  scope: string | null
  applyPolicy: 'REVIEW_ONLY' | 'AUTO_APPLY_GREEN_ONLY'
  execute: boolean
  title: string
  summary: string
  assistantMessage: string
  raw?: JsonRecord | null
}

export function parseStructuredField(message: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im')
    const match = message.match(pattern)
    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }
  return null
}

export function parseCsvField(value: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function parseBooleanField(value: string | null) {
  if (!value) return null
  const normalized = normalizeText(value)
  if (['true', 'yes', '1', 'run', 'queue'].includes(normalized)) return true
  if (['false', 'no', '0', 'draft', 'save'].includes(normalized)) return false
  return null
}

function getModelConfig() {
  const apiKey =
    process.env.AUTOMATION_LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || ''
  const baseUrl = (process.env.AUTOMATION_LLM_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AUTOMATION_LLM_MODEL?.trim() || ''
  return {
    enabled: Boolean(apiKey && model),
    apiKey,
    baseUrl,
    model,
  }
}

async function postJsonCompletion(schemaName: string, system: string, user: string) {
  const config = getModelConfig()
  if (!config.enabled) return null

  const requestedTimeoutMs = getAutomationRuntimeCaps().llmTimeoutMs
  const timeoutMs = applyAutomationTimeoutCeiling(requestedTimeoutMs, 45000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

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
        response_format: {
          type: 'json_object',
        },
        messages: [
          { role: 'system', content: `${system}\nReturn JSON only. Schema name: ${schemaName}.` },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      recordModelCall({
        operation: schemaName,
        model: config.model,
        success: false,
        inputText: `${system}\n${user}`,
        durationMs: Date.now() - startedAt,
        error: `HTTP ${response.status}`,
      })
      return null
    }

    const payload = (await response.json().catch(() => null)) as JsonRecord | null
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      recordModelCall({
        operation: schemaName,
        model: config.model,
        success: false,
        inputText: `${system}\n${user}`,
        durationMs: Date.now() - startedAt,
        error: 'Empty response content',
      })
      return null
    }

    try {
      const parsed = JSON.parse(content) as JsonRecord
      recordModelCall({
        operation: schemaName,
        model: config.model,
        success: true,
        inputText: `${system}\n${user}`,
        outputText: content,
        inputTokens:
          typeof payload?.usage?.prompt_tokens === 'number' ? payload.usage.prompt_tokens : null,
        outputTokens:
          typeof payload?.usage?.completion_tokens === 'number'
            ? payload.usage.completion_tokens
            : null,
        durationMs: Date.now() - startedAt,
      })
      return parsed
    } catch {
      recordModelCall({
        operation: schemaName,
        model: config.model,
        success: false,
        inputText: `${system}\n${user}`,
        outputText: content,
        durationMs: Date.now() - startedAt,
        error: 'Invalid JSON response',
      })
      return null
    }
  } catch (error) {
    recordModelCall({
      operation: schemaName,
      model: config.model,
      success: false,
      inputText: `${system}\n${user}`,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function clampConfidence(value: unknown, fallback = 0.65) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function detectClaimTypes(message: string) {
  const lower = normalizeText(message)
  const matches = new Set<string>()

  if (lower.includes('station')) {
    matches.add('NEW_STATION')
    matches.add('UPDATED_STATION')
    matches.add('REMOVED_STATION')
  }
  if (lower.includes('line rename') || lower.includes('rename line')) {
    matches.add('LINE_RENAME_CANDIDATE')
  }
  if (lower.includes('line color') || lower.includes('colour')) {
    matches.add('LINE_COLOR_CANDIDATE')
  }
  if (lower.includes('operator')) {
    matches.add('OPERATOR_SUGGESTION')
    matches.add('OPERATOR_METADATA_CANDIDATE')
  }
  if (lower.includes('metadata') || lower.includes('header') || lower.includes('description')) {
    matches.add('METADATA_CANDIDATE')
    matches.add('HEADER_SUGGESTION')
  }
  if (lower.includes('image') || lower.includes('photo')) {
    matches.add('IMAGE_CANDIDATE')
  }
  if (lower.includes('new line') || lower.includes('line add')) {
    matches.add('NEW_LINE')
  }

  return Array.from(matches)
}

export function detectCities(message: string, availableCitySlugs: string[]) {
  const lower = normalizeText(message)
  const matched = new Set<string>()
  for (const slug of availableCitySlugs) {
    const slugText = normalizeText(slug.replace(/-/g, ' '))
    if (!slugText) continue
    if (lower.includes(slugText)) {
      matched.add(slug)
      continue
    }
    const lastToken = slugText.split(' ').filter(Boolean).slice(-1)[0]
    if (lastToken && lastToken.length >= 5 && lower.includes(lastToken)) {
      matched.add(slug)
    }
  }
  return Array.from(matched).slice(0, 20)
}

export function heuristicOperatorMessage(message: string): ParsedAutomationOperatorAction {
  const availableCitySlugs = Array.from(AVAILABLE_CITY_SLUGS)
  const lower = normalizeText(message)
  const structuredMode = parseStructuredField(message, ['Mode', 'Request mode'])
  const structuredCities = parseCsvField(
    parseStructuredField(message, ['Cities', 'City slugs', 'City slugs?']),
  )
  const structuredClaimTypes = parseCsvField(
    parseStructuredField(message, ['Claim types', 'Claims', 'Candidate types']),
  )
  const structuredScope = parseStructuredField(message, ['Scope'])
  const structuredApplyPolicy = parseStructuredField(message, ['Apply policy', 'Apply'])
  const structuredExecute = parseBooleanField(
    parseStructuredField(message, ['Execute', 'Queue now']),
  )

  const mode =
    structuredMode === 'MANUAL_UPDATE' || structuredMode === 'EXPLAIN'
      ? structuredMode
      : structuredMode === 'TARGETED_RESEARCH'
        ? 'TARGETED_RESEARCH'
        : lower.includes('why') || lower.includes('explain') || lower.includes('what evidence')
          ? 'EXPLAIN'
          : lower.includes('manual update') ||
              lower.includes('update city') ||
              lower.includes('refresh')
            ? 'MANUAL_UPDATE'
            : 'TARGETED_RESEARCH'

  const citySlugs = (
    structuredCities.length > 0
      ? structuredCities
      : detectCities(message, availableCitySlugs)
  ).filter((value) => AVAILABLE_CITY_SLUGS.has(value))

  const claimTypes = structuredClaimTypes.length > 0 ? structuredClaimTypes : detectClaimTypes(message)

  const scope =
    structuredScope && structuredScope.toLowerCase() !== 'all'
      ? structuredScope
      : lower.includes('metadata')
        ? 'metadata'
        : lower.includes('station')
          ? 'stations'
          : lower.includes('line')
            ? 'lines'
            : lower.includes('image')
              ? 'imagery'
              : null

  const title =
    mode === 'EXPLAIN'
      ? `Explain automation state${citySlugs[0] ? ` for ${citySlugs[0]}` : ''}`
      : mode === 'MANUAL_UPDATE'
        ? `Manual update run${citySlugs.length ? ` for ${citySlugs.join(', ')}` : ''}`
        : `Targeted research run${citySlugs.length ? ` for ${citySlugs.join(', ')}` : ''}`

  const summary =
    mode === 'EXPLAIN'
      ? 'Summarize evidence quality, current lane, and missing evidence for the requested cities or claims.'
      : mode === 'MANUAL_UPDATE'
        ? 'Run a manual, operator-directed deep research and structured update pass for the selected cities.'
        : 'Run a targeted research pass for the selected cities and claim types.'

  const assistantMessage =
    citySlugs.length > 0
      ? `${mode === 'EXPLAIN' ? 'I can summarize the current automation state' : 'I can create a targeted automation request'} for ${citySlugs.join(', ')}.`
      : 'I could not confidently match a city slug. Add an exact city slug from the game config.'

  return {
    mode,
    citySlugs,
    claimTypes,
    scope,
    applyPolicy:
      structuredApplyPolicy === 'AUTO_APPLY_GREEN_ONLY'
        ? 'AUTO_APPLY_GREEN_ONLY'
        : 'REVIEW_ONLY',
    execute:
      mode !== 'EXPLAIN' &&
      citySlugs.length > 0 &&
      (structuredExecute ?? true),
    title,
    summary,
    assistantMessage,
    raw: null,
  }
}

export async function interpretOperatorChatMessage(message: string) {
  const availableCitySlugs = Array.from(AVAILABLE_CITY_SLUGS)
  const heuristic = heuristicOperatorMessage(message)
  const config = getModelConfig()
  if (!config.enabled) {
    return heuristic
  }

  const json = await postJsonCompletion(
    'automation_operator_action',
    'You parse operator requests for a transit automation admin console. Only use city slugs from the provided list. Prefer review-first automation. If no city can be matched, return an empty citySlugs array and explain that.',
    JSON.stringify({
      message,
      availableCitySlugs,
      allowedModes: ['TARGETED_RESEARCH', 'MANUAL_UPDATE', 'EXPLAIN'],
      allowedApplyPolicies: ['REVIEW_ONLY', 'AUTO_APPLY_GREEN_ONLY'],
    }),
  )

  if (!json) {
    return heuristic
  }

  return {
    mode:
      json.mode === 'MANUAL_UPDATE' || json.mode === 'EXPLAIN'
        ? json.mode
        : 'TARGETED_RESEARCH',
    citySlugs: Array.isArray(json.citySlugs)
      ? json.citySlugs
          .map((value: unknown) => String(value))
          .filter((value: string) => AVAILABLE_CITY_SLUGS.has(value))
      : heuristic.citySlugs,
    claimTypes: Array.isArray(json.claimTypes)
      ? json.claimTypes.map((value: unknown) => String(value)).filter(Boolean)
      : heuristic.claimTypes,
    scope: typeof json.scope === 'string' ? json.scope : heuristic.scope,
    applyPolicy:
      json.applyPolicy === 'AUTO_APPLY_GREEN_ONLY'
        ? 'AUTO_APPLY_GREEN_ONLY'
        : 'REVIEW_ONLY',
    execute: json.execute !== false,
    title: typeof json.title === 'string' ? json.title : heuristic.title,
    summary: typeof json.summary === 'string' ? json.summary : heuristic.summary,
    assistantMessage:
      typeof json.assistantMessage === 'string'
        ? json.assistantMessage
        : heuristic.assistantMessage,
    raw: json,
  } satisfies ParsedAutomationOperatorAction
}

export async function extractGroundedFactsFromArtifact(input: {
  artifact: CollectedArtifact
  text: string
  city: string
  lineNames: string[]
}): Promise<GroundedFactExtractionResult | null> {
  const config = getModelConfig()
  if (!config.enabled || !input.text.trim()) return null

  const json = await postJsonCompletion(
    'grounded_artifact_facts',
    'Extract only transit-update facts supported by the provided artifact text. Facts must be grounded in the text. Do not infer unsupported claims. Every fact must include a short exact excerpt used as the citation.',
    JSON.stringify({
      city: input.city,
      artifact: {
        artifactType: input.artifact.artifactType,
        sourceUrl: input.artifact.sourceUrl,
        sourceDomain: input.artifact.sourceDomain,
        mimeType: input.artifact.mimeType,
      },
      lineNames: input.lineNames,
      allowedKinds: [
        'LINE_REFERENCE',
        'LINE_COLOR_REFERENCE',
        'LINE_RENAME_REFERENCE',
        'STATION_REFERENCE',
        'OPENING_REFERENCE',
        'EXTENSION_REFERENCE',
        'OPERATOR_REFERENCE',
        'OPERATOR_METADATA_REFERENCE',
        'MAP_REFERENCE',
        'DATASET_REFERENCE',
        'CONFLICT_REFERENCE',
      ],
      text: input.text.slice(0, 7000),
    }),
  )

  if (!json || !Array.isArray(json.facts)) return null

  const facts: ExtractedArtifactFact[] = json.facts.flatMap(
    (entry: JsonRecord) => {
      const excerpt =
        typeof entry.excerpt === 'string'
          ? entry.excerpt.replace(/\s+/g, ' ').trim()
          : ''
      if (!entry.kind || !excerpt) return []
      return [
        {
          citySlug: input.city,
          artifactType: input.artifact.artifactType,
          sourceUrl: input.artifact.sourceUrl,
          sourceDomain: input.artifact.sourceDomain,
          kind: String(entry.kind) as ExtractedArtifactFact['kind'],
          label:
            typeof entry.label === 'string'
              ? entry.label
              : 'Grounded model fact',
          snippet: excerpt.slice(0, 240),
          ...(typeof entry.lineName === 'string'
            ? { lineName: entry.lineName }
            : {}),
          confidence: clampConfidence(entry.confidence, 0.7),
          metadata: {
            groundedModel: true,
            groundedProvider: 'chat-completions',
            groundedModelName: config.model,
            citations: [
              {
                sourceUrl: input.artifact.sourceUrl,
                artifactType: input.artifact.artifactType,
                locatorType:
                  entry.locatorType === 'HTML_SELECTOR' ||
                  entry.locatorType === 'PDF_PAGE' ||
                  entry.locatorType === 'OCR_TEXT'
                    ? entry.locatorType
                    : 'TEXT',
                excerpt,
                excerptHash:
                  typeof entry.excerptHash === 'string' && entry.excerptHash
                    ? entry.excerptHash
                    : hashExcerpt(excerpt),
                ...(typeof entry.pageNumber === 'number'
                  ? { pageNumber: entry.pageNumber }
                  : {}),
                ...(typeof entry.domSelector === 'string'
                  ? { domSelector: entry.domSelector }
                  : {}),
              },
            ],
            ...(entry.metadata && typeof entry.metadata === 'object'
              ? entry.metadata
              : {}),
          },
        } satisfies ExtractedArtifactFact,
      ]
    },
  )

  const citations = facts.flatMap((fact) => {
    const factCitations = fact.metadata?.citations
    return Array.isArray(factCitations) ? factCitations : []
  })

  return {
    facts,
    citations,
    provider: 'chat-completions',
    model: config.model,
  }
}

export async function buildGroundedVerification(
  candidate: ReviewCandidate,
): Promise<GroundedVerificationResult | null> {
  const config = getModelConfig()
  if (!config.enabled) return null

  const json = await postJsonCompletion(
    'grounded_candidate_verification',
    'Review a transit automation candidate using only the provided sources and snippets. Return a conservative contradiction assessment, missing evidence list, next best action, and any recommended research task types. Prefer review-first answers when uncertain.',
    JSON.stringify({
      candidate: {
        citySlug: candidate.citySlug,
        type: candidate.type,
        title: candidate.title,
        summary: candidate.summary,
        confidence: candidate.confidence,
        diff: candidate.diff,
        metadata: candidate.metadata,
      },
      sources: candidate.sources.map((source) => ({
        sourceType: source.sourceType,
        label: source.label,
        url: source.url,
        snippet: source.snippet,
        metadata: source.metadata,
      })),
      allowedTaskTypes: [
        'FIND_OFFICIAL_OPERATOR_PAGE',
        'FIND_MAP_PDF',
        'FIND_GTFS_FEED',
        'FIND_PRESS_PAGE',
        'VERIFY_STATION_RENAME',
        'VERIFY_LINE_RENAME',
        'VERIFY_LINE_COLOR',
        'VERIFY_OPERATOR',
        'VERIFY_METADATA',
      ],
    }),
  )

  if (!json) return null

  return {
    contradictionFlag: Boolean(json.contradictionFlag),
    contradictionReasons: Array.isArray(json.contradictionReasons)
      ? json.contradictionReasons.map((value: unknown) => String(value))
      : [],
    confidenceAdjustment:
      typeof json.confidenceAdjustment === 'number' ? json.confidenceAdjustment : 0,
    missingEvidence: Array.isArray(json.missingEvidence)
      ? json.missingEvidence.map((value: unknown) => String(value))
      : [],
    nextBestAction: typeof json.nextBestAction === 'string' ? json.nextBestAction : null,
    recommendedTaskTypes: Array.isArray(json.recommendedTaskTypes)
      ? json.recommendedTaskTypes
          .map((value: unknown) => String(value))
          .filter(Boolean) as ResearchTaskType[]
      : [],
    supportScore: typeof json.supportScore === 'number' ? json.supportScore : undefined,
    plannerReason: typeof json.plannerReason === 'string' ? json.plannerReason : null,
    citations: Array.isArray(json.citations) ? json.citations : [],
    raw: json,
  }
}

export async function buildGroundedResearchPlan(input: {
  candidate: ReviewCandidate
  latestVerificationJson?: JsonRecord | null
  failedUrls?: string[]
  missingEvidence?: string[]
}): Promise<ResearchPlannerOutput | null> {
  const config = getModelConfig()
  if (!config.enabled) return null

  const json = await postJsonCompletion(
    'grounded_research_plan',
    'Plan the next best bounded follow-up research actions for a transit automation candidate. Recommend no action when evidence is already sufficient or when further research is unlikely to help.',
    JSON.stringify({
      candidate: input.candidate,
      latestVerificationJson: input.latestVerificationJson || null,
      failedUrls: input.failedUrls || [],
      missingEvidence: input.missingEvidence || [],
      allowedTaskTypes: [
        'FIND_OFFICIAL_OPERATOR_PAGE',
        'FIND_MAP_PDF',
        'FIND_GTFS_FEED',
        'FIND_PRESS_PAGE',
        'VERIFY_STATION_RENAME',
        'VERIFY_LINE_RENAME',
        'VERIFY_LINE_COLOR',
        'VERIFY_OPERATOR',
        'VERIFY_METADATA',
      ],
    }),
  )

  if (!json) return null

  const recommendedTaskTypes = Array.isArray(json.recommendedTaskTypes)
    ? json.recommendedTaskTypes.map((value: unknown) => String(value)).filter(Boolean) as ResearchTaskType[]
    : []

  return {
    followUpRecommended: Boolean(json.followUpRecommended),
    missingEvidence: Array.isArray(json.missingEvidence)
      ? json.missingEvidence.map((value: unknown) => String(value))
      : [],
    nextBestAction: typeof json.nextBestAction === 'string' ? json.nextBestAction : null,
    recommendedTaskTypes,
    tasks: recommendedTaskTypes.map((taskType) => ({
      taskType,
      title: `Research ${String(taskType).toLowerCase().replaceAll('_', ' ')} for ${input.candidate.title}`,
      citySlug: input.candidate.citySlug,
      claimType: input.candidate.type,
      candidateTitle: input.candidate.title,
      entityKey: input.candidate.entityKey,
      metadata: {
        planner: 'grounded-llm',
      },
    })),
    plannerReason: typeof json.plannerReason === 'string' ? json.plannerReason : null,
    citations: Array.isArray(json.citations) ? json.citations : [],
  }
}
