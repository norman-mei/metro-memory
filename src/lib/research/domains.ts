// Source-domain trust tiers for the research engine.
// Tier 1 = official/authoritative, Tier 2 = established news/reference,
// Tier 3 = weak (blogs, forums, social). DB overrides via the SourceDomain table.

import { prisma } from '@/lib/prisma'

const TIER1_HOST_PATTERNS: RegExp[] = [
  /\.gov(\.[a-z]{2})?$/i,
  /\.gouv\./i,
  /\.gob\./i,
  /(^|\.)metro/i,
  /(^|\.)mta\./i,
  /(^|\.)tfl\./i,
  /(^|\.)ratp\./i,
  /(^|\.)sncf\./i,
  /(^|\.)bvg\./i,
  /transit/i,
  /transport(e|s|ation)?/i,
  /subway/i,
  /railway|\brail\b/i,
]

const TIER2_HOST_PATTERNS: RegExp[] = [
  /wikipedia\.org$/i,
  /wikimedia\.org$/i,
  /railwaygazette|urbanrail|themayor|citymetric|masstransit/i,
  /reuters|apnews|bbc|nytimes|theguardian/i,
]

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Heuristic tier from the URL alone (no DB). 1 best, 3 weakest. */
export function heuristicTier(url: string): number {
  const host = hostnameOf(url)
  if (!host) return 3
  if (TIER1_HOST_PATTERNS.some((re) => re.test(host))) return 1
  if (TIER2_HOST_PATTERNS.some((re) => re.test(host))) return 2
  return 3
}

/**
 * Resolves the effective tier for a URL, applying any DB override
 * (SourceDomain.tier / blocked). Blocked domains return tier 99.
 */
export async function resolveTier(url: string): Promise<number> {
  const host = hostnameOf(url)
  if (!host) return 3
  const record = await prisma.sourceDomain.findUnique({ where: { domain: host } }).catch(() => null)
  if (record?.blocked) return 99
  if (record?.tier) return record.tier
  return heuristicTier(url)
}

/** Records that a domain was seen (upserts a SourceDomain row with heuristic tier). */
export async function touchDomain(url: string): Promise<void> {
  const host = hostnameOf(url)
  if (!host) return
  const tier = heuristicTier(url)
  await prisma.sourceDomain
    .upsert({
      where: { domain: host },
      create: { domain: host, tier, lastSeenAt: new Date() },
      update: { lastSeenAt: new Date() },
    })
    .catch(() => undefined)
}
