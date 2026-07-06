// Claim extraction: given collected source snippets for a city PLUS the city's
// current project data, ask the LLM for structured claims that are genuinely NEW.
// Strict JSON; returns [] if the model is disabled or returns nothing usable.

import { callResearchModel } from './model'
import type { CityGrounding } from './cityData'
import {
  clampConfidence,
  isKnownClaimType,
  type EvidenceInput,
  type ExtractedClaim,
} from './types'

export type CollectedSource = {
  url: string
  title: string
  snippet: string
  date: string | null
  text: string
}

function buildSystemPrompt(enabledTypes: string[]): string {
  return `You are a transit-data research analyst for the game "Metro Memory".
You are given a city slug, the city's CURRENT data already in the game, and web sources.
Extract only concrete, recently-changed facts that require updating the game's data.

Hard rules:
- Report ONLY changes whose END RESULT is NOT already present in the current data.
  A change is ALREADY REFLECTED (so you must SKIP it) when its result is present, e.g.:
    * a rename "X → Y" is already reflected if Y already appears in the current stations — SKIP it;
    * a new station Y is already reflected if Y already appears in the current stations — SKIP it;
    * a new line Y is already reflected if Y already appears in the current lines — SKIP it.
  Station names may be romanized differently; treat a match on the romanized/base name as "already present".
- If the city already exists in the game, never output "new_city_candidate" for it.
- Only assert facts the provided sources actually support. Never guess or infer beyond the sources.
- Every claim MUST cite at least one source URL from the provided sources.
- Prefer official/agency sources; lower confidence when evidence is weak or conflicting.
- confidence is your own 0..1 estimate of how well the sources support the claim.
- Populate beforeValue / afterValue as PLAIN NAME STRINGS: for station_renamed use the OLD name
  as beforeValue and the NEW name as afterValue; for station_opened / line_added use the new
  name as afterValue. These are used to detect duplicates, so they must be accurate.

Allowed claimType values — output ONLY these, nothing else:
${enabledTypes.join(', ')}

Return JSON of the exact shape:
{"claims":[{"claimType":"...","title":"...","summary":"...","beforeValue":<any|null>,
"afterValue":<any|null>,"confidence":0.0,"evidence":[{"sourceUrl":"...","sourceTitle":"...",
"sourceDate":"YYYY-MM-DD|null","excerpt":"short supporting quote"}]}]}
If there are no genuinely new changes, return {"claims":[]}.`
}

function groundingBlock(citySlug: string, g: CityGrounding): string {
  if (!g.exists) {
    return `CURRENT PROJECT DATA: "${citySlug}" is NOT yet in Metro Memory. Only a well-sourced new_city_candidate could apply (and only if that type is allowed above).`
  }
  const lines = g.lines.length ? g.lines.join(', ') : '(none listed)'
  const stations = g.stations.length ? g.stations.join(', ') : '(none listed)'
  return `CURRENT PROJECT DATA for "${citySlug}" — this city is ALREADY in Metro Memory. Do NOT re-report anything already present here.
Current lines: ${lines}
Current stations (${g.stations.length}): ${stations}`
}

// Normalizes a station/line name for duplicate detection: strips diacritics,
// native-script parentheticals, and generic words, leaving the romanized base.
function normalizeName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split('(')[0]
    .toLowerCase()
    .replace(/\b(station|metro|line|stn|st)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function afterName(afterValue: unknown): string {
  if (typeof afterValue === 'string') return afterValue
  if (afterValue && typeof afterValue === 'object') {
    const v = afterValue as Record<string, unknown>
    if (typeof v.name === 'string') return v.name
    if (typeof v.to === 'string') return v.to
  }
  return ''
}

const STATION_RESULT_TYPES = new Set(['station_opened', 'station_renamed', 'station_moved'])

export async function extractClaims(
  citySlug: string,
  sources: CollectedSource[],
  grounding: CityGrounding,
  enabledTypes: string[],
): Promise<ExtractedClaim[]> {
  if (!sources.length) return []

  const enabledSet = new Set(enabledTypes)
  const existingStations = new Set(grounding.stations.map(normalizeName).filter(Boolean))
  const existingLines = new Set(grounding.lines.map(normalizeName).filter(Boolean))

  const sourceBlock = sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\nDate: ${s.date ?? 'unknown'}\nContent: ${s.snippet} ${s.text}`.slice(
          0,
          4000,
        ),
    )
    .join('\n\n')

  const user = `City slug: ${citySlug}\n\n${groundingBlock(citySlug, grounding)}\n\nSources:\n${sourceBlock}`

  const parsed = await callResearchModel('claim_extraction', buildSystemPrompt(enabledTypes), user)
  if (!parsed || !Array.isArray(parsed.claims)) return []

  const validUrls = new Set(sources.map((s) => s.url))

  const claims: ExtractedClaim[] = []
  for (const raw of parsed.claims) {
    if (!raw || typeof raw !== 'object') continue
    const claimType = String((raw as any).claimType || '').trim()
    const title = String((raw as any).title || '').trim()
    const summary = String((raw as any).summary || '').trim()
    if (!title || !isKnownClaimType(claimType)) continue
    if (!enabledSet.has(claimType)) continue // drop disabled types defensively

    // Deterministic duplicate guard: drop claims whose end result already exists.
    const rawAfter = (raw as any).afterValue
    const afterNorm = normalizeName(afterName(rawAfter))
    const titleNorm = normalizeName(title)
    if (STATION_RESULT_TYPES.has(claimType)) {
      const resultExists =
        (afterNorm && existingStations.has(afterNorm)) ||
        // fallback when afterValue is missing: opened/moved station named in the title
        (!afterNorm &&
          claimType !== 'station_renamed' &&
          [...existingStations].some((n) => n.length >= 4 && titleNorm.includes(n)))
      if (resultExists) continue
    }
    if (claimType === 'line_added' && afterNorm && existingLines.has(afterNorm)) continue

    const evidence: EvidenceInput[] = Array.isArray((raw as any).evidence)
      ? (raw as any).evidence
          .filter((e: any) => e && typeof e.sourceUrl === 'string')
          .map((e: any) => ({
            sourceUrl: String(e.sourceUrl),
            sourceTitle: e.sourceTitle ? String(e.sourceTitle) : null,
            sourceDate: e.sourceDate && e.sourceDate !== 'null' ? String(e.sourceDate) : null,
            excerpt: e.excerpt ? String(e.excerpt).slice(0, 500) : null,
          }))
      : []

    // Drop hallucinated citations that don't match a provided source.
    const groundedEvidence = evidence.filter((e) => validUrls.has(e.sourceUrl))
    if (!groundedEvidence.length) continue

    claims.push({
      citySlug,
      claimType,
      title,
      summary,
      beforeValue: (raw as any).beforeValue ?? null,
      afterValue: (raw as any).afterValue ?? null,
      confidence: clampConfidence((raw as any).confidence),
      evidence: groundedEvidence,
    })
  }

  return claims
}
