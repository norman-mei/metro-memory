export const RANKED_RULESETS = [
  'classic',
  'no-line-colors',
  'strict-spelling',
  'one-life',
] as const

export type RankedRulesetId = (typeof RANKED_RULESETS)[number]

export const RANKED_SOURCES = [
  'free-play',
  'battle',
] as const

export type RankedRunSourceId = (typeof RANKED_SOURCES)[number]

export const DEFAULT_RANKED_RULESET: RankedRulesetId = 'classic'
export const DEFAULT_RANKED_SOURCE: RankedRunSourceId = 'free-play'
export const RANKED_REVEAL_REASON = 'REVEAL_USED'
export const DAILY_RETRY_REASON = 'DAILY_ALREADY_PLAYED'
export const ACCOUNT_REQUIRED_REASON = 'ACCOUNT_REQUIRED'

const RULESET_LABELS: Record<RankedRulesetId, string> = {
  classic: 'Classic',
  'no-line-colors': 'No Line Colors',
  'strict-spelling': 'Strict Spelling',
  'one-life': 'One Life',
}

const SOURCE_LABELS: Record<RankedRunSourceId, string> = {
  'free-play': 'Free Play',
  battle: 'Battle',
}

const RULESET_TO_PRISMA: Record<RankedRulesetId, 'CLASSIC' | 'NO_LINE_COLORS' | 'STRICT_SPELLING' | 'ONE_LIFE'> = {
  classic: 'CLASSIC',
  'no-line-colors': 'NO_LINE_COLORS',
  'strict-spelling': 'STRICT_SPELLING',
  'one-life': 'ONE_LIFE',
}

const RULESET_FROM_PRISMA = Object.fromEntries(
  Object.entries(RULESET_TO_PRISMA).map(([key, value]) => [value, key]),
) as Record<(typeof RULESET_TO_PRISMA)[RankedRulesetId], RankedRulesetId>

const SOURCE_TO_PRISMA: Record<RankedRunSourceId, 'FREE_PLAY' | 'BATTLE'> = {
  'free-play': 'FREE_PLAY',
  battle: 'BATTLE',
}

const SOURCE_FROM_PRISMA = Object.fromEntries(
  Object.entries(SOURCE_TO_PRISMA).map(([key, value]) => [value, key]),
) as Record<(typeof SOURCE_TO_PRISMA)[RankedRunSourceId], RankedRunSourceId>

export function parseRankedRuleset(value: unknown): RankedRulesetId {
  return typeof value === 'string' && (RANKED_RULESETS as readonly string[]).includes(value)
    ? (value as RankedRulesetId)
    : DEFAULT_RANKED_RULESET
}

export function parseRankedRunSource(value: unknown): RankedRunSourceId {
  return typeof value === 'string' && (RANKED_SOURCES as readonly string[]).includes(value)
    ? (value as RankedRunSourceId)
    : DEFAULT_RANKED_SOURCE
}

export function formatRankedRuleset(value: RankedRulesetId) {
  return RULESET_LABELS[value]
}

export function formatRankedRunSource(value: RankedRunSourceId) {
  return SOURCE_LABELS[value]
}

export function toPrismaRankedRuleset(value: RankedRulesetId) {
  return RULESET_TO_PRISMA[value]
}

export function fromPrismaRankedRuleset(
  value: keyof typeof RULESET_FROM_PRISMA | null | undefined,
): RankedRulesetId {
  if (!value) {
    return DEFAULT_RANKED_RULESET
  }
  return RULESET_FROM_PRISMA[value] ?? DEFAULT_RANKED_RULESET
}

export function toPrismaRankedRunSource(value: RankedRunSourceId) {
  return SOURCE_TO_PRISMA[value]
}

export function fromPrismaRankedRunSource(
  value: 'FREE_PLAY' | 'DAILY' | 'CHALLENGE' | 'BATTLE' | null | undefined,
): RankedRunSourceId {
  if (!value) {
    return DEFAULT_RANKED_SOURCE
  }
  if (value === 'FREE_PLAY' || value === 'BATTLE') {
    return SOURCE_FROM_PRISMA[value]
  }
  return DEFAULT_RANKED_SOURCE
}

export function buildRankedHref(
  cityPath: string,
  options: {
    ranked?: boolean
    ruleset?: RankedRulesetId
    source?: RankedRunSourceId
    seed?: string
    battleId?: string | null
    playlistRunId?: string | null
  } = {},
) {
  const params = new URLSearchParams()
  params.set('ranked', options.ranked === false ? '0' : '1')
  params.set('ruleset', options.ruleset ?? DEFAULT_RANKED_RULESET)
  params.set('source', options.source ?? DEFAULT_RANKED_SOURCE)
  if (options.seed) {
    params.set('seed', options.seed)
  }
  if (options.battleId) {
    params.set('battleId', options.battleId)
  }
  if (options.playlistRunId) {
    params.set('playlistRunId', options.playlistRunId)
  }
  return `${cityPath}?${params.toString()}`
}

export function createChallengeSlug(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'challenge'
}

export function formatDuration(ms: number | null | undefined) {
  if (!Number.isFinite(ms ?? NaN)) {
    return '—'
  }
  const totalSeconds = Math.max(0, Math.round((ms ?? 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return '—'
  }
  return `${Math.round((value ?? 0) * 100)}%`
}
