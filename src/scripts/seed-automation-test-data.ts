/**
 * Seed script for automation review panel testing.
 *
 * Creates a realistic automation run with 6 candidates across 3 cities,
 * each with claims, verifications, policy decisions, sources, and citations.
 *
 * Usage:
 *   npx tsx src/scripts/seed-automation-test-data.ts
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'

// Load environment variables from .env.local (Next.js doesn't load them for standalone scripts)
config({ path: resolve(process.cwd(), '.env.local') })

import { Prisma, PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()

function toNullableJson(
  value: Prisma.InputJsonValue | Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return (value as Prisma.InputJsonValue | null | undefined) ?? Prisma.DbNull
}

function hashExcerpt(text: string) {
  return createHash('sha256').update(text).digest('hex')
}

const TEST_RUN_MARKER = 'seed-test-run'

async function main() {
  console.log('🚇 Seeding automation test data...')

  // Clean up any previous seed data
  const existingRuns = await prisma.automationRun.findMany({
    where: { source: TEST_RUN_MARKER },
    select: { id: true },
  })
  if (existingRuns.length > 0) {
    console.log(`  Cleaning up ${existingRuns.length} previous seed run(s)...`)
    await prisma.automationRun.deleteMany({
      where: { source: TEST_RUN_MARKER },
    })
  }

  // ── Create the automation run ──────────────────────────────────────
  const run = await prisma.automationRun.create({
    data: {
      source: TEST_RUN_MARKER,
      scope: 'all',
      status: 'PENDING_REVIEW',
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      finishedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      reportMarkdown: [
        '# Automation Sync Report — Seed Test',
        '',
        '## Chicago',
        '- Source enrichment: cta_official -> https://www.transitchicago.com/stations',
        '',
        '## New York City',
        '- Source enrichment: mta_official -> https://new.mta.info/maps',
        '',
        '## London',
        '- Source enrichment: tfl_official -> https://tfl.gov.uk/maps/track',
      ].join('\n'),
      summary: {
        pending: 6,
        approved: 0,
        rejected: 0,
      },
    },
  })
  console.log(`  Created run: ${run.id}`)

  // ── Helper to create a full candidate + claim + verification ───────
  async function createCandidate(opts: {
    citySlug: string
    type: string
    title: string
    summary: string
    entityKey: string
    confidence: number
    lane: 'GREEN' | 'YELLOW' | 'RED'
    autoApplyEligible: boolean
    overallScore: number
    sourceTierScore: number
    recencyScore: number
    consistencyScore: number
    contradictionFlag: boolean
    likelyRealTransitLine: boolean
    hasConflict: boolean
    evidenceCount: number
    officialEvidenceCount: number
    gtfsEvidenceCount: number
    policyReason: string
    diff?: Record<string, unknown> | null
    beforeValue?: Record<string, unknown> | null
    afterValue?: Record<string, unknown> | null
    sources?: Array<{ sourceType: string; label: string; url: string; snippet?: string }>
    missingEvidence?: string[]
    nextBestAction?: string
    followUpRecommended?: boolean
    claimResearchState?: Record<string, unknown>
    bootstrapKind?: string
    stationUpdateSetKey?: string
    stationUpdateSetLabel?: string
    citations?: Array<{
      excerpt: string
      sourceUrl: string
      locatorType: string
      pageNumber?: number
      domSelector?: string
    }>
  }) {
    const candidate = await prisma.automationCandidate.create({
      data: {
        runId: run.id,
        citySlug: opts.citySlug,
        type: opts.type as any,
        status: 'PENDING',
        entityKey: opts.entityKey,
        title: opts.title,
        summary: opts.summary,
        confidence: opts.confidence,
        diff: toNullableJson(opts.diff),
        beforeValue: toNullableJson(opts.beforeValue),
        afterValue: toNullableJson(opts.afterValue),
        metadata: {
          ...(opts.bootstrapKind ? { bootstrapKind: opts.bootstrapKind } : {}),
          ...(opts.stationUpdateSetKey ? { stationUpdateSetKey: opts.stationUpdateSetKey } : {}),
          ...(opts.stationUpdateSetLabel ? { stationUpdateSetLabel: opts.stationUpdateSetLabel } : {}),
        },
      },
    })

    // Create claim
    const claim = await prisma.automationClaim.create({
      data: {
        runId: run.id,
        candidateId: candidate.id,
        citySlug: opts.citySlug,
        claimType: opts.type,
        title: opts.title,
        summary: opts.summary,
        confidence: opts.confidence,
        lane: opts.lane,
        status: 'PENDING_REVIEW',
        autoApplyEligible: opts.autoApplyEligible,
        reason: opts.policyReason,
        verificationNotes: opts.claimResearchState
          ? toNullableJson({ claimResearchState: opts.claimResearchState })
          : Prisma.DbNull,
        beforeValueJson: toNullableJson(opts.beforeValue),
        afterValueJson: toNullableJson(opts.afterValue),
      },
    })

    // Create verification
    await prisma.automationVerification.create({
      data: {
        claimId: claim.id,
        sourceTierScore: opts.sourceTierScore,
        evidenceCount: opts.evidenceCount,
        recencyScore: opts.recencyScore,
        consistencyScore: opts.consistencyScore,
        contradictionFlag: opts.contradictionFlag,
        verifierVersion: 'seed-v1',
        verificationJson: {
          overallScore: opts.overallScore,
          likelyRealTransitLine: opts.likelyRealTransitLine,
          hasConflict: opts.hasConflict,
          officialEvidenceCount: opts.officialEvidenceCount,
          gtfsEvidenceCount: opts.gtfsEvidenceCount,
          missingEvidence: opts.missingEvidence || [],
          nextBestAction: opts.nextBestAction || null,
          followUpRecommended: opts.followUpRecommended || false,
        },
      },
    })

    // Create policy decision
    await prisma.automationPolicyDecision.create({
      data: {
        claimId: claim.id,
        lane: opts.lane,
        decisionReason: opts.policyReason,
        autoApplyAllowed: opts.autoApplyEligible,
        policyVersion: 'seed-v1',
      },
    })

    // Create sources
    if (opts.sources) {
      for (const source of opts.sources) {
        await prisma.automationSource.create({
          data: {
            candidateId: candidate.id,
            sourceType: source.sourceType,
            label: source.label,
            url: source.url,
            snippet: source.snippet || null,
          },
        })
      }
    }

    // Create citations
    if (opts.citations) {
      // Need an artifact first
      const artifact = await prisma.automationArtifact.create({
        data: {
          runId: run.id,
          citySlug: opts.citySlug,
          artifactType: 'OFFICIAL_PAGE',
          sourceUrl: opts.citations[0]?.sourceUrl || null,
          sourceDomain: opts.citations[0]?.sourceUrl
            ? new URL(opts.citations[0].sourceUrl).hostname
            : null,
          fetchedAt: new Date(),
        },
      })

      for (const citation of opts.citations) {
        await prisma.automationArtifactCitation.create({
          data: {
            claimId: claim.id,
            artifactId: artifact.id,
            excerpt: citation.excerpt,
            excerptHash: hashExcerpt(citation.excerpt),
            sourceUrl: citation.sourceUrl,
            locatorType: citation.locatorType as any,
            pageNumber: citation.pageNumber ?? null,
            domSelector: citation.domSelector ?? null,
          },
        })
      }
    }

    console.log(`  ✓ ${opts.citySlug} — ${opts.title} (${opts.lane}, ${opts.type})`)
    return candidate
  }

  // ── Candidate 1: Chicago new station (GREEN, auto-apply) ───────────
  await createCandidate({
    citySlug: 'chicago',
    type: 'NEW_STATION',
    title: 'Add Damen station to CTA Green Line',
    summary:
      'GTFS feed confirms Damen as an active stop on the Green Line. Two official CTA sources corroborate.',
    entityKey: 'green|damen',
    confidence: 0.95,
    lane: 'GREEN',
    autoApplyEligible: true,
    overallScore: 0.94,
    sourceTierScore: 0.92,
    recencyScore: 0.98,
    consistencyScore: 0.96,
    contradictionFlag: false,
    likelyRealTransitLine: true,
    hasConflict: false,
    evidenceCount: 4,
    officialEvidenceCount: 2,
    gtfsEvidenceCount: 2,
    policyReason:
      'High-confidence GTFS-backed station addition with official corroboration. Auto-apply eligible.',
    diff: {
      change: 'gtfs-stop-add',
      lineId: 'green',
      stationName: 'Damen',
      lat: 41.8539,
      lng: -87.6761,
    },
    afterValue: {
      name: 'Damen',
      lineId: 'green',
      coordinates: [-87.6761, 41.8539],
    },
    stationUpdateSetKey: 'chicago|green|stations',
    stationUpdateSetLabel: 'Green Line station update set',
    sources: [
      {
        sourceType: 'GTFS_FEED',
        label: 'CTA GTFS 2026-04',
        url: 'https://www.transitchicago.com/downloads/sch_data/',
        snippet: 'stop_id: 30014, stop_name: Damen, route_id: Green',
      },
      {
        sourceType: 'OFFICIAL_PAGE',
        label: 'CTA Station List',
        url: 'https://www.transitchicago.com/greenline/',
        snippet: 'Damen (Green Line) — Serving the Bucktown and Ukrainian Village neighborhoods.',
      },
    ],
    citations: [
      {
        excerpt:
          'Damen station serves the Green Line with entrances at N Damen Ave and W Lake St.',
        sourceUrl: 'https://www.transitchicago.com/greenline/',
        locatorType: 'HTML_SELECTOR',
        domSelector: '#station-list .station-damen',
      },
      {
        excerpt:
          'GTFS stop record confirms stop_id 30014 (Damen) on route_id Green with location 41.8539, -87.6761.',
        sourceUrl: 'https://www.transitchicago.com/downloads/sch_data/',
        locatorType: 'TEXT',
      },
    ],
  })

  // ── Candidate 2: Chicago station rename (YELLOW, needs review) ─────
  await createCandidate({
    citySlug: 'chicago',
    type: 'UPDATED_STATION',
    title: 'Rename "Sox-35th" to "Sox–35th" on CTA Red Line',
    summary:
      'The official CTA website and GTFS feed now use an en-dash instead of a hyphen in the station name.',
    entityKey: 'red|sox-35th',
    confidence: 0.82,
    lane: 'YELLOW',
    autoApplyEligible: false,
    overallScore: 0.78,
    sourceTierScore: 0.88,
    recencyScore: 0.95,
    consistencyScore: 0.65,
    contradictionFlag: false,
    likelyRealTransitLine: true,
    hasConflict: false,
    evidenceCount: 2,
    officialEvidenceCount: 1,
    gtfsEvidenceCount: 1,
    policyReason:
      'Minor typographic rename. GTFS backs it, but the old name is still widely used. Needs human review to confirm the project should adopt the en-dash variant.',
    diff: {
      change: 'gtfs-stop-rename',
      lineId: 'red',
      from: 'Sox-35th',
      to: 'Sox–35th',
    },
    beforeValue: { name: 'Sox-35th', lineId: 'red' },
    afterValue: { name: 'Sox–35th', lineId: 'red' },
    stationUpdateSetKey: 'chicago|red|stations',
    stationUpdateSetLabel: 'Red Line station update set',
    missingEvidence: ['Additional official confirmation of the en-dash spelling convention'],
    nextBestAction: 'Check CTA press releases or board documents for the canonical spelling.',
    followUpRecommended: true,
    sources: [
      {
        sourceType: 'GTFS_FEED',
        label: 'CTA GTFS 2026-04',
        url: 'https://www.transitchicago.com/downloads/sch_data/',
        snippet: 'stop_name: Sox–35th (en-dash)',
      },
    ],
  })

  // ── Candidate 3: NYC line rename (GREEN, high confidence) ──────────
  await createCandidate({
    citySlug: 'nyc',
    type: 'LINE_RENAME_CANDIDATE',
    title: 'Rename "SIR" to "Staten Island Railway" in NYC data',
    summary:
      'MTA officially rebranded the Staten Island Railway from the older abbreviation. Multiple press releases confirm.',
    entityKey: 'sir',
    confidence: 0.97,
    lane: 'GREEN',
    autoApplyEligible: true,
    overallScore: 0.96,
    sourceTierScore: 0.95,
    recencyScore: 0.99,
    consistencyScore: 0.97,
    contradictionFlag: false,
    likelyRealTransitLine: true,
    hasConflict: false,
    evidenceCount: 5,
    officialEvidenceCount: 3,
    gtfsEvidenceCount: 1,
    policyReason:
      'Strong official evidence from MTA press releases. Safe for auto-apply.',
    diff: {
      change: 'gtfs-line-rename',
      from: 'SIR',
      to: 'Staten Island Railway',
    },
    beforeValue: { lineName: 'SIR' },
    afterValue: { lineName: 'Staten Island Railway' },
    sources: [
      {
        sourceType: 'OFFICIAL_PAGE',
        label: 'MTA Press Release',
        url: 'https://new.mta.info/press-release/staten-island-railway-rebrand',
        snippet:
          'The MTA Board approved the official rename of the Staten Island Railway, effective January 2026.',
      },
      {
        sourceType: 'GTFS_FEED',
        label: 'MTA GTFS 2026-04',
        url: 'https://new.mta.info/developers',
        snippet: 'route_long_name: Staten Island Railway',
      },
    ],
    citations: [
      {
        excerpt:
          'Effective January 15, 2026, the Staten Island Railway replaces the legacy "SIR" branding across all MTA communications and signage.',
        sourceUrl: 'https://new.mta.info/press-release/staten-island-railway-rebrand',
        locatorType: 'HTML_SELECTOR',
        domSelector: 'article.press-release p:first-of-type',
      },
    ],
  })

  // ── Candidate 4: London removed station (RED, conflicting) ─────────
  await createCandidate({
    citySlug: 'london',
    type: 'REMOVED_STATION',
    title: 'Remove Blake Hall from Central Line',
    summary:
      'One source says Blake Hall closed in 1981. Another OSM entry still lists it as active. Conflicting evidence.',
    entityKey: 'central|blake-hall',
    confidence: 0.55,
    lane: 'RED',
    autoApplyEligible: false,
    overallScore: 0.48,
    sourceTierScore: 0.7,
    recencyScore: 0.4,
    consistencyScore: 0.3,
    contradictionFlag: true,
    likelyRealTransitLine: true,
    hasConflict: true,
    evidenceCount: 3,
    officialEvidenceCount: 1,
    gtfsEvidenceCount: 0,
    policyReason:
      'Contradicting evidence between official TfL records (closed) and OSM data (still mapped). Blocked by automation audit metrics for source conflicts.',
    diff: {
      change: 'gtfs-stop-removed',
      lineId: 'central',
      stationName: 'Blake Hall',
    },
    beforeValue: { name: 'Blake Hall', lineId: 'central', status: 'active' },
    afterValue: null,
    missingEvidence: [
      'Definitive TfL closure announcement for Blake Hall',
      'Confirmation that Blake Hall is no longer in the Oyster/contactless zone list',
    ],
    nextBestAction: 'Search TfL closure archives for Blake Hall station.',
    followUpRecommended: true,
    claimResearchState: {
      status: 'BLOCKED',
      statusReason: 'Contradicting evidence prevents safe resolution.',
      stopReasons: ['CONTRADICTING_SOURCES', 'INSUFFICIENT_OFFICIAL_EVIDENCE'],
      runAttemptCount: 2,
      maxResearchRunAttempts: 3,
      pendingTaskCount: 0,
      satisfiedTaskCount: 1,
      blockedTaskCount: 1,
      exhaustedTaskCount: 0,
      evidence: {
        officialEvidenceCount: 1,
        gtfsEvidenceCount: 0,
        contradictionScore: 0.72,
        nextBestAction: 'Search TfL closure archives for Blake Hall station.',
      },
    },
    sources: [
      {
        sourceType: 'OFFICIAL_PAGE',
        label: 'TfL Station Info',
        url: 'https://tfl.gov.uk/modes/tube/',
        snippet: 'Blake Hall closed 31 October 1981.',
      },
      {
        sourceType: 'SEARCH_RESULT',
        label: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/',
        snippet: 'node: Blake Hall station, railway=station, line=Central',
      },
    ],
    citations: [
      {
        excerpt: 'Blake Hall station was permanently closed on 31 October 1981 due to low usage.',
        sourceUrl: 'https://tfl.gov.uk/corporate/about-tfl/culture-and-heritage/londons-transport-a-history/london-underground/station-closures',
        locatorType: 'HTML_SELECTOR',
        domSelector: 'table.closures tr:nth-child(5)',
      },
    ],
  })

  // ── Candidate 5: London line color update (YELLOW) ─────────────────
  await createCandidate({
    citySlug: 'london',
    type: 'LINE_COLOR_CANDIDATE',
    title: 'Update Elizabeth Line color to #6950A1',
    summary:
      'The official TfL brand guidelines specify #6950A1 for the Elizabeth line. The current dataset uses #7156A5.',
    entityKey: 'elizabeth',
    confidence: 0.88,
    lane: 'YELLOW',
    autoApplyEligible: false,
    overallScore: 0.85,
    sourceTierScore: 0.92,
    recencyScore: 0.96,
    consistencyScore: 0.88,
    contradictionFlag: false,
    likelyRealTransitLine: true,
    hasConflict: false,
    evidenceCount: 2,
    officialEvidenceCount: 2,
    gtfsEvidenceCount: 0,
    policyReason:
      'Color code difference is cosmetic but sourced from official brand guidelines. Needs review-only since color changes affect visual identity.',
    diff: {
      change: 'line-color-update',
      lineId: 'elizabeth',
      from: '#7156A5',
      to: '#6950A1',
    },
    beforeValue: { lineId: 'elizabeth', color: '#7156A5' },
    afterValue: { lineId: 'elizabeth', color: '#6950A1' },
    sources: [
      {
        sourceType: 'OFFICIAL_PAGE',
        label: 'TfL Brand Guidelines',
        url: 'https://tfl.gov.uk/info-for/media/design-standards',
        snippet: 'Elizabeth line: Pantone 2685, Hex #6950A1',
      },
    ],
  })

  // ── Candidate 6: NYC metadata update (GREEN, auto-apply) ───────────
  await createCandidate({
    citySlug: 'nyc',
    type: 'METADATA_CANDIDATE',
    title: 'Update NYC subway description from MTA sources',
    summary:
      'Refreshed the generated metadata description to reference current MTA ridership figures and the 2026 service expansion.',
    entityKey: 'nyc-metadata-desc',
    confidence: 0.91,
    lane: 'GREEN',
    autoApplyEligible: true,
    overallScore: 0.9,
    sourceTierScore: 0.93,
    recencyScore: 0.97,
    consistencyScore: 0.92,
    contradictionFlag: false,
    likelyRealTransitLine: false,
    hasConflict: false,
    evidenceCount: 3,
    officialEvidenceCount: 2,
    gtfsEvidenceCount: 0,
    policyReason:
      'Metadata-only change backed by official MTA ridership reports. Safe for auto-apply.',
    diff: {
      change: 'metadata-description-update',
    },
    beforeValue: {
      description:
        'The New York City Subway is a rapid transit system serving four of the five boroughs.',
    },
    afterValue: {
      description:
        'The New York City Subway, with over 5.6 million daily riders, is the busiest rapid transit system in North America, serving 472 stations across four boroughs.',
    },
    bootstrapKind: 'initial-registry-bootstrap',
    sources: [
      {
        sourceType: 'OFFICIAL_PAGE',
        label: 'MTA Ridership Dashboard',
        url: 'https://new.mta.info/agency/new-york-city-transit/subway-bus-ridership-2026',
        snippet: 'Average weekday ridership: 5.6 million (Q1 2026)',
      },
    ],
  })

  // ── Create a research run for the blocked London candidate ─────────
  const blockedCandidate = await prisma.automationCandidate.findFirst({
    where: { runId: run.id, citySlug: 'london', type: 'REMOVED_STATION' },
    include: { claim: true },
  })

  if (blockedCandidate?.claim) {
    const researchRun = await prisma.automationResearchRun.create({
      data: {
        parentRunId: run.id,
        claimId: blockedCandidate.claim.id,
        citySlug: 'london',
        status: 'BLOCKED',
        attemptNumber: 2,
        triggerReason: 'Insufficient evidence after first verification pass.',
        startedAt: new Date(Date.now() - 1000 * 60 * 45),
        finishedAt: new Date(Date.now() - 1000 * 60 * 35),
      },
    })

    await prisma.automationResearchTask.create({
      data: {
        researchRunId: researchRun.id,
        claimId: blockedCandidate.claim.id,
        citySlug: 'london',
        taskType: 'FIND_OFFICIAL_OPERATOR_PAGE',
        status: 'SATISFIED',
        satisfied: true,
        priority: 1,
        retryCount: 1,
        resultJson: { url: 'https://tfl.gov.uk/modes/tube/' },
      },
    })

    await prisma.automationResearchTask.create({
      data: {
        researchRunId: researchRun.id,
        claimId: blockedCandidate.claim.id,
        citySlug: 'london',
        taskType: 'FIND_PRESS_PAGE',
        status: 'BLOCKED',
        satisfied: false,
        priority: 2,
        retryCount: 2,
        blockedReason: 'No press release found for Blake Hall closure in accessible archives.',
      },
    })
  }

  // ── Create some audit metrics ──────────────────────────────────────
  await prisma.automationPolicyMetric.upsert({
    where: { scope_key: { scope: 'DOMAIN', key: 'openstreetmap.org' } },
    update: {
      reviewedCount: 12,
      approvedCount: 7,
      rejectedCount: 5,
      trustScore: 0.58,
      approvalRate: 0.583,
      rejectionRate: 0.417,
    },
    create: {
      scope: 'DOMAIN',
      key: 'openstreetmap.org',
      reviewedCount: 12,
      approvedCount: 7,
      rejectedCount: 5,
      trustScore: 0.58,
      approvalRate: 0.583,
      rejectionRate: 0.417,
    },
  })

  await prisma.automationPolicyMetric.upsert({
    where: { scope_key: { scope: 'CITY', key: 'london' } },
    update: {
      reviewedCount: 8,
      approvedCount: 5,
      rejectedCount: 3,
      trustScore: 0.62,
      revertRate: 0.125,
    },
    create: {
      scope: 'CITY',
      key: 'london',
      reviewedCount: 8,
      approvedCount: 5,
      rejectedCount: 3,
      trustScore: 0.62,
      revertRate: 0.125,
    },
  })

  await prisma.automationPolicyMetric.upsert({
    where: { scope_key: { scope: 'CLAIM_TYPE', key: 'REMOVED_STATION' } },
    update: {
      reviewedCount: 6,
      approvedCount: 2,
      rejectedCount: 4,
      trustScore: 0.33,
      rejectionRate: 0.667,
    },
    create: {
      scope: 'CLAIM_TYPE',
      key: 'REMOVED_STATION',
      reviewedCount: 6,
      approvedCount: 2,
      rejectedCount: 4,
      trustScore: 0.33,
      rejectionRate: 0.667,
    },
  })

  console.log('')
  console.log('✅ Seed complete!')
  console.log(`   Run ID: ${run.id}`)
  console.log('   6 candidates, 3 cities, with claims, verifications, and sources.')
  console.log('')
  console.log('   Visit http://localhost:3000/admin/automation to see the review panel.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
