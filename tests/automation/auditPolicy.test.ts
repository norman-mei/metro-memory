import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateAutomationTrustScore } from '../../src/lib/automationAuditCore.ts'
import { buildClaimPolicy } from '../../scripts/metro-sync/policy.ts'

test('calculateAutomationTrustScore penalizes rejection and revert history', () => {
  const healthy = calculateAutomationTrustScore({
    reviewedCount: 10,
    approvedCount: 9,
    rejectedCount: 1,
    appliedCount: 7,
    revertedCount: 0,
  })
  const unhealthy = calculateAutomationTrustScore({
    reviewedCount: 10,
    approvedCount: 3,
    rejectedCount: 7,
    appliedCount: 3,
    revertedCount: 2,
  })

  assert.ok(healthy.trustScore > unhealthy.trustScore)
  assert.ok(unhealthy.revertRate > 0)
})

test('buildClaimPolicy demotes risky historical context out of green lane', () => {
  const candidate = {
    citySlug: 'nottingham',
    type: 'NEW_STATION' as const,
    title: 'Add Example Street',
    confidence: 0.88,
    afterValue: { id: 1 },
    sources: [
      {
        sourceType: 'gtfs-diff',
        url: 'https://example.com/gtfs.zip',
        metadata: {
          artifactType: 'GTFS_FEED',
        },
      },
    ],
  }

  const verification = {
    sourceTierScore: 0.92,
    evidenceCount: 2,
    recencyScore: 0.9,
    consistencyScore: 0.9,
    contradictionFlag: false,
    verificationJson: {
      overallScore: 0.84,
      gtfsEvidenceCount: 1,
      officialEvidenceCount: 0,
      likelyRealTransitLine: true,
      hasConflict: false,
    },
  }

  const greenPolicy = buildClaimPolicy(candidate, verification, {
    domainTrustScore: 0.8,
    cityTrustScore: 0.7,
    claimTypeTrustScore: 0.72,
    domainBlocked: false,
  })
  const yellowPolicy = buildClaimPolicy(candidate, verification, {
    domainTrustScore: 0.28,
    cityTrustScore: 0.32,
    claimTypeTrustScore: 0.31,
    domainBlocked: false,
  })
  const redPolicy = buildClaimPolicy(candidate, verification, {
    domainTrustScore: 0.8,
    cityTrustScore: 0.7,
    claimTypeTrustScore: 0.72,
    domainBlocked: true,
  })
  const forcedYellowPolicy = buildClaimPolicy(candidate, verification, {
    domainTrustScore: 0.8,
    cityTrustScore: 0.7,
    claimTypeTrustScore: 0.72,
    domainBlocked: false,
    forcedLane: 'YELLOW',
  })

  assert.equal(greenPolicy.lane, 'GREEN')
  assert.equal(yellowPolicy.lane, 'YELLOW')
  assert.equal(redPolicy.lane, 'RED')
  assert.equal(forcedYellowPolicy.lane, 'YELLOW')
})
