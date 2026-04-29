import type { Registry } from './types'

export type ResearchTier = 'tier1' | 'tier2' | 'tier3'

export type RegistryResearchPlan = {
  tier: ResearchTier
  cadenceMonths: 1 | 3 | 6
  batchSlot: number
  deepResearchDue: boolean
  reason: string
}

function hashCity(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function deriveTierFromLineCount(lineCount: number): ResearchTier {
  if (lineCount >= 8) return 'tier1'
  if (lineCount >= 4) return 'tier2'
  return 'tier3'
}

function cadenceForTier(tier: ResearchTier): 1 | 3 | 6 {
  if (tier === 'tier1') return 1
  if (tier === 'tier2') return 3
  return 6
}

function normalizeMonthIndex(value: number) {
  return ((value % 12) + 12) % 12
}

export function resolveRegistryResearchPlan(
  registry: Registry,
  date = new Date(),
  mode = process.env.METRO_SYNC_DEEP_RESEARCH_MODE || 'batch',
) {
  if (mode === 'off') {
    return {
      tier: 'tier3',
      cadenceMonths: 6,
      batchSlot: 0,
      deepResearchDue: false,
      reason: 'Deep research disabled by METRO_SYNC_DEEP_RESEARCH_MODE=off.',
    } satisfies RegistryResearchPlan
  }

  const lineCount = Array.isArray(registry.lines) ? registry.lines.length : 0
  const configuredTier = registry.automation?.researchTier
  const tier = configuredTier || deriveTierFromLineCount(lineCount)
  const cadenceMonths = registry.automation?.cadenceMonths || cadenceForTier(tier)
  const batchSlot =
    typeof registry.automation?.batchSlot === 'number'
      ? ((registry.automation.batchSlot % cadenceMonths) + cadenceMonths) % cadenceMonths
      : hashCity(registry.city) % cadenceMonths

  if (registry.automation?.alwaysDeepResearch || mode === 'all') {
    return {
      tier,
      cadenceMonths,
      batchSlot,
      deepResearchDue: true,
      reason:
        mode === 'all'
          ? 'Deep research forced for all cities.'
          : 'Deep research forced by city automation override.',
    } satisfies RegistryResearchPlan
  }

  const overrideMonth = process.env.METRO_SYNC_MONTH_INDEX_OVERRIDE
  const monthIndex =
    overrideMonth && /^\d+$/.test(overrideMonth)
      ? normalizeMonthIndex(Number(overrideMonth))
      : date.getUTCMonth()
  const cycleIndex = monthIndex % cadenceMonths
  const deepResearchDue = cadenceMonths === 1 ? true : cycleIndex === batchSlot

  return {
    tier,
    cadenceMonths,
    batchSlot,
    deepResearchDue,
    reason:
      cadenceMonths === 1
        ? 'Tier 1 city receives deep research every month.'
        : `Tier ${tier.slice(-1)} city runs deep research every ${cadenceMonths} months in slot ${batchSlot}. Current cycle slot: ${cycleIndex}.`,
  } satisfies RegistryResearchPlan
}
