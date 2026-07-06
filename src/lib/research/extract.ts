// Claim extraction: given collected source snippets for a city, ask the LLM to
// produce structured claims with citations. Strict JSON; returns [] if the model
// is disabled or returns nothing usable.

import { callResearchModel } from './model'
import {
  RESEARCH_CLAIM_TYPES,
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

const SYSTEM_PROMPT = `You are a transit-data research analyst for the game "Metro Memory".
You are given a city slug and several web sources about that city's metro/rail system.
Extract only concrete, recently-changed facts that would require updating the game's data:
new/closed/renamed/moved stations, added/removed/extended/shortened lines, line color
changes, operator changes, header/metadata changes, icon or image opportunities, or a
brand-new city worth adding.

Rules:
- Only assert facts the provided sources actually support. Never guess.
- Every claim MUST cite at least one source URL from the provided sources.
- Prefer official/agency sources. If evidence is weak or conflicting, lower confidence.
- Be concise and structured. Do not invent stations or dates.
- confidence is your own 0..1 estimate of how well the sources support the claim.

Allowed claimType values: ${RESEARCH_CLAIM_TYPES.join(', ')}.

Return JSON of the exact shape:
{"claims":[{"claimType":"...","title":"...","summary":"...","beforeValue":<any|null>,
"afterValue":<any|null>,"confidence":0.0,"evidence":[{"sourceUrl":"...","sourceTitle":"...",
"sourceDate":"YYYY-MM-DD|null","excerpt":"short supporting quote"}]}]}`

export async function extractClaims(
  citySlug: string,
  sources: CollectedSource[],
): Promise<ExtractedClaim[]> {
  if (!sources.length) return []

  const sourceBlock = sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\nDate: ${s.date ?? 'unknown'}\nContent: ${s.snippet} ${s.text}`.slice(
          0,
          4000,
        ),
    )
    .join('\n\n')

  const user = `City slug: ${citySlug}\n\nSources:\n${sourceBlock}`

  const parsed = await callResearchModel('claim_extraction', SYSTEM_PROMPT, user)
  if (!parsed || !Array.isArray(parsed.claims)) return []

  const validUrls = new Set(sources.map((s) => s.url))

  const claims: ExtractedClaim[] = []
  for (const raw of parsed.claims) {
    if (!raw || typeof raw !== 'object') continue
    const claimType = String((raw as any).claimType || '').trim()
    const title = String((raw as any).title || '').trim()
    const summary = String((raw as any).summary || '').trim()
    if (!title || !isKnownClaimType(claimType)) continue

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
