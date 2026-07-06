// Shared types and constants for the rebuilt research engine (v2).
// Kept dependency-free so both the Next app and the scripts CLI can import it.

export const RESEARCH_CLAIM_TYPES = [
  'station_opened',
  'station_closed',
  'station_renamed',
  'station_moved',
  'line_added',
  'line_removed',
  'line_extended',
  'line_shortened',
  'line_color_changed',
  'operator_changed',
  'header_metadata_changed',
  'icon_candidate',
  'image_candidate',
  'new_city_candidate',
] as const

export type ResearchClaimType = (typeof RESEARCH_CLAIM_TYPES)[number]

export type ResearchLaneValue = 'GREEN' | 'YELLOW' | 'RED'

// Claim types safe enough to auto-apply when confidence + sources are strong.
export const SAFE_AUTO_CLAIM_TYPES: ReadonlySet<string> = new Set([
  'station_opened',
  'station_closed',
  'station_renamed',
  'line_color_changed',
])

// Claim types that must never auto-apply regardless of confidence.
export const NEVER_AUTO_CLAIM_TYPES: ReadonlySet<string> = new Set([
  'new_city_candidate',
  'image_candidate',
])

// Confidence thresholds (see docs/automation-research-agent-plan.md).
export const GREEN_CONFIDENCE_THRESHOLD = 0.88
export const YELLOW_CONFIDENCE_THRESHOLD = 0.55

export type EvidenceInput = {
  sourceUrl: string
  sourceTitle?: string | null
  sourceDate?: string | null // ISO date string
  excerpt?: string | null
  tier?: number | null
}

export type ExtractedClaim = {
  citySlug: string
  claimType: string
  title: string
  summary: string
  beforeValue?: unknown
  afterValue?: unknown
  confidence: number // 0..1 as proposed by the model, re-scored by policy
  evidence: EvidenceInput[]
}

export type ResearchTriggerValue = 'SCHEDULED' | 'MANUAL' | 'CHAT'

export type RunResearchInput = {
  citySlugs: string[]
  scope?: string | null
  trigger?: ResearchTriggerValue
  sessionId?: string | null
  maxSourcesPerCity?: number
  reviewer?: string | null
}

export type RunResearchSummary = {
  runId: string
  citySlugs: string[]
  claimsCreated: number
  green: number
  yellow: number
  red: number
  errors: string[]
}

export function isKnownClaimType(value: string): value is ResearchClaimType {
  return (RESEARCH_CLAIM_TYPES as readonly string[]).includes(value)
}

export function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
