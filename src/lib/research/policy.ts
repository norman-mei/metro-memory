// Policy layer: turns a model-proposed claim + its evidence tiers into a final
// confidence score and a review lane (GREEN / YELLOW / RED).

import {
  GREEN_CONFIDENCE_THRESHOLD,
  NEVER_AUTO_CLAIM_TYPES,
  SAFE_AUTO_CLAIM_TYPES,
  YELLOW_CONFIDENCE_THRESHOLD,
  clampConfidence,
  type ResearchLaneValue,
} from './types'

export type PolicyInput = {
  claimType: string
  proposedConfidence: number
  evidenceTiers: number[] // effective tiers of each evidence source (1 best)
}

export type PolicyResult = {
  confidence: number
  lane: ResearchLaneValue
  reason: string
}

/**
 * Re-scores confidence from the model's proposal plus source quality, then maps
 * to a lane. Source quality dominates: a strong tier-1 source lifts confidence,
 * while tier-3-only evidence caps it low.
 */
export function assignLane(input: PolicyInput): PolicyResult {
  const tiers = input.evidenceTiers.filter((t) => t > 0 && t < 99)
  const usableTiers = tiers.length ? tiers : [3]
  const bestTier = Math.min(...usableTiers)
  const evidenceCount = usableTiers.length

  const base = clampConfidence(input.proposedConfidence)

  // Source-quality multiplier: tier 1 -> 1.0, tier 2 -> 0.8, tier 3 -> 0.5.
  const tierFactor = bestTier === 1 ? 1.0 : bestTier === 2 ? 0.8 : 0.5
  // Corroboration bonus for multiple independent sources.
  const corroboration = Math.min(evidenceCount - 1, 2) * 0.05

  const confidence = clampConfidence(base * tierFactor + corroboration)

  // Lane rules.
  if (NEVER_AUTO_CLAIM_TYPES.has(input.claimType)) {
    return {
      confidence,
      lane: confidence >= YELLOW_CONFIDENCE_THRESHOLD ? 'YELLOW' : 'RED',
      reason: `claim type "${input.claimType}" is never auto-applied`,
    }
  }

  if (bestTier >= 3) {
    return {
      confidence,
      lane: confidence >= YELLOW_CONFIDENCE_THRESHOLD ? 'YELLOW' : 'RED',
      reason: 'no strong (tier 1-2) source',
    }
  }

  if (
    confidence >= GREEN_CONFIDENCE_THRESHOLD &&
    bestTier === 1 &&
    SAFE_AUTO_CLAIM_TYPES.has(input.claimType)
  ) {
    return { confidence, lane: 'GREEN', reason: 'strong tier-1 evidence for a safe claim type' }
  }

  if (confidence >= YELLOW_CONFIDENCE_THRESHOLD) {
    return { confidence, lane: 'YELLOW', reason: 'plausible but needs human review' }
  }

  return { confidence, lane: 'RED', reason: 'low confidence' }
}
