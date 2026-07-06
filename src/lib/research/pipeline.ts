// Orchestrates a research run: collect -> extract -> policy -> persist.
// This is the single entry point used by both the scripts CLI and the admin API.

import { prisma } from '@/lib/prisma'

import { extractClaims, type CollectedSource } from './extract'
import { assignLane } from './policy'
import { resolveTier, touchDomain } from './domains'
import { fetchPageText, searchWeb } from './search'
import type { RunResearchInput, RunResearchSummary } from './types'

const DEFAULT_MAX_SOURCES = 6

function buildQueries(citySlug: string, scope?: string | null): string[] {
  const city = citySlug.replace(/-/g, ' ')
  const base = [
    `${city} metro new station ${new Date().getFullYear()}`,
    `${city} metro line extension opening`,
    `${city} subway station renamed OR closed`,
  ]
  if (scope) base.unshift(`${city} metro ${scope}`)
  return base
}

async function collectForCity(
  citySlug: string,
  scope: string | null | undefined,
  maxSources: number,
): Promise<CollectedSource[]> {
  const queries = buildQueries(citySlug, scope)
  const seen = new Map<string, CollectedSource>()

  for (const query of queries) {
    const results = await searchWeb(query, 6)
    for (const r of results) {
      if (seen.has(r.url) || seen.size >= maxSources) continue
      await touchDomain(r.url)
      const text = await fetchPageText(r.url)
      seen.set(r.url, {
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        date: r.date,
        text,
      })
    }
    if (seen.size >= maxSources) break
  }

  return Array.from(seen.values())
}

/**
 * Runs the full pipeline for the given cities and persists a ResearchRun with its
 * ResearchClaims + ClaimEvidence. Never throws for a single-city failure; errors
 * are collected into the run summary.
 */
export async function runResearch(input: RunResearchInput): Promise<RunResearchSummary> {
  const citySlugs = input.citySlugs.map((c) => c.trim()).filter(Boolean)
  const maxSources = input.maxSourcesPerCity ?? DEFAULT_MAX_SOURCES

  const run = await prisma.researchRun.create({
    data: {
      trigger: input.trigger ?? 'MANUAL',
      scope: input.scope ?? null,
      citySlugs,
      status: 'RUNNING',
      sessionId: input.sessionId ?? null,
    },
  })

  const errors: string[] = []
  let green = 0
  let yellow = 0
  let red = 0
  let claimsCreated = 0

  for (const citySlug of citySlugs) {
    try {
      const sources = await collectForCity(citySlug, input.scope, maxSources)
      const claims = await extractClaims(citySlug, sources)

      for (const claim of claims) {
        const evidenceTiers = await Promise.all(
          claim.evidence.map((e) => resolveTier(e.sourceUrl)),
        )
        const policy = assignLane({
          claimType: claim.claimType,
          proposedConfidence: claim.confidence,
          evidenceTiers,
        })

        await prisma.researchClaim.create({
          data: {
            runId: run.id,
            citySlug: claim.citySlug,
            claimType: claim.claimType,
            title: claim.title,
            summary: claim.summary,
            beforeJson: (claim.beforeValue ?? null) as any,
            afterJson: (claim.afterValue ?? null) as any,
            confidence: policy.confidence,
            lane: policy.lane,
            status: 'PENDING',
            reviewNotes: policy.reason,
            evidence: {
              create: claim.evidence.map((e, i) => ({
                sourceUrl: e.sourceUrl,
                sourceTitle: e.sourceTitle ?? null,
                sourceDate: e.sourceDate ? new Date(e.sourceDate) : null,
                excerpt: e.excerpt ?? null,
                tier: evidenceTiers[i] && evidenceTiers[i] < 99 ? evidenceTiers[i] : 3,
              })),
            },
          },
        })

        claimsCreated += 1
        if (policy.lane === 'GREEN') green += 1
        else if (policy.lane === 'YELLOW') yellow += 1
        else red += 1
      }
    } catch (error) {
      errors.push(`${citySlug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const summary: RunResearchSummary = {
    runId: run.id,
    citySlugs,
    claimsCreated,
    green,
    yellow,
    red,
    errors,
  }

  await prisma.researchRun.update({
    where: { id: run.id },
    data: {
      status: errors.length && !claimsCreated ? 'FAILED' : 'COMPLETED',
      finishedAt: new Date(),
      summaryJson: summary as any,
      errorLog: errors.length ? errors.join('\n') : null,
    },
  })

  return summary
}
