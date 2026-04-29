import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClaimPolicy } from '../../scripts/metro-sync/policy.ts'

test('buildClaimPolicy allows strong structured station updates to go green', () => {
  const result = buildClaimPolicy(
    {
      citySlug: 'sample-city',
      type: 'NEW_STATION',
      entityKey: 'line1|Central',
      title: 'Add official station Central on line1',
      confidence: 0.91,
      metadata: { likelyRealTransitLine: true },
      sources: [
        {
          sourceType: 'gtfs-diff',
          label: 'GTFS stop Central',
          url: 'https://data.example.com/gtfs.zip',
          metadata: { artifactType: 'GTFS_FEED', extractedFactKind: 'STATION_REFERENCE' },
        },
        {
          sourceType: 'official-page',
          label: 'Agency station bulletin',
          url: 'https://metro.example.org/stations/central',
          metadata: { artifactType: 'OFFICIAL_PAGE', extractedFactKind: 'STATION_REFERENCE' },
        },
      ],
    },
    {
      sourceTierScore: 0.95,
      evidenceCount: 3,
      recencyScore: 0.9,
      consistencyScore: 0.9,
      contradictionFlag: false,
      verificationJson: {
        overallScore: 0.94,
        supportScore: 0.82,
        contradictionScore: 0.04,
        officialEvidenceCount: 2,
        officialDomainCount: 2,
        gtfsEvidenceCount: 1,
        likelyRealTransitLine: true,
        hasConflict: false,
        followUpRecommended: false,
        missingEvidence: [],
      },
    },
    {
      domainTrustScore: 0.84,
      cityTrustScore: 0.72,
      claimTypeTrustScore: 0.68,
    },
  )

  assert.equal(result.lane, 'GREEN')
  assert.equal(result.autoApplyAllowed, true)
})

test('buildClaimPolicy can stay green while withholding auto-apply on thinner official evidence', () => {
  const result = buildClaimPolicy(
    {
      citySlug: 'sample-city',
      type: 'NEW_STATION',
      entityKey: 'line1|Central',
      title: 'Add official station Central on line1',
      confidence: 0.9,
      metadata: { likelyRealTransitLine: true },
      sources: [
        {
          sourceType: 'official-page',
          label: 'Agency station bulletin',
          url: 'https://metro.example.org/stations/central',
          metadata: { artifactType: 'OFFICIAL_PAGE', extractedFactKind: 'STATION_REFERENCE' },
        },
      ],
    },
    {
      sourceTierScore: 0.92,
      evidenceCount: 2,
      recencyScore: 0.9,
      consistencyScore: 0.9,
      contradictionFlag: false,
      verificationJson: {
        overallScore: 0.91,
        supportScore: 0.72,
        contradictionScore: 0.03,
        officialEvidenceCount: 1,
        officialDomainCount: 1,
        gtfsEvidenceCount: 0,
        likelyRealTransitLine: true,
        hasConflict: false,
        followUpRecommended: false,
        missingEvidence: [],
      },
    },
    {
      domainTrustScore: 0.84,
      cityTrustScore: 0.72,
      claimTypeTrustScore: 0.68,
    },
  )

  assert.equal(result.lane, 'GREEN')
  assert.equal(result.autoApplyAllowed, false)
})

test('buildClaimPolicy supports temporary stricter tuning overrides for replay calibration', () => {
  const result = buildClaimPolicy(
    {
      citySlug: 'sample-city',
      type: 'NEW_STATION',
      entityKey: 'line1|Central',
      title: 'Add official station Central on line1',
      confidence: 0.91,
      metadata: { likelyRealTransitLine: true },
      sources: [
        {
          sourceType: 'official-page',
          label: 'Agency station bulletin',
          url: 'https://metro.example.org/stations/central',
          metadata: { artifactType: 'OFFICIAL_PAGE', extractedFactKind: 'STATION_REFERENCE' },
        },
        {
          sourceType: 'official-press-release',
          label: 'Agency notice',
          url: 'https://metro.example.org/news/central',
          metadata: { artifactType: 'PRESS_RELEASE', extractedFactKind: 'STATION_REFERENCE' },
        },
      ],
    },
    {
      sourceTierScore: 0.95,
      evidenceCount: 3,
      recencyScore: 0.9,
      consistencyScore: 0.9,
      contradictionFlag: false,
      verificationJson: {
        overallScore: 0.94,
        supportScore: 0.82,
        contradictionScore: 0.04,
        officialEvidenceCount: 2,
        officialDomainCount: 1,
        gtfsEvidenceCount: 0,
        likelyRealTransitLine: true,
        hasConflict: false,
        followUpRecommended: false,
        missingEvidence: [],
      },
    },
    {
      domainTrustScore: 0.84,
      cityTrustScore: 0.72,
      claimTypeTrustScore: 0.68,
      policyTuning: {
        autoApplyMinOfficialDomainCount: 2,
      },
    },
  )

  assert.equal(result.lane, 'GREEN')
  assert.equal(result.autoApplyAllowed, false)
})

test('buildClaimPolicy keeps image candidates manual only', () => {
  const result = buildClaimPolicy(
    {
      citySlug: 'sample-city',
      type: 'IMAGE_CANDIDATE',
      title: 'Review image candidate',
      confidence: 0.99,
      metadata: {},
      sources: [
        {
          sourceType: 'image-preview',
          label: 'preview',
          url: 'https://example.com/image.jpg',
        },
      ],
    },
    {
      sourceTierScore: 0.99,
      evidenceCount: 2,
      recencyScore: 0.9,
      consistencyScore: 0.9,
      contradictionFlag: false,
      verificationJson: {
        overallScore: 0.99,
        officialEvidenceCount: 1,
        gtfsEvidenceCount: 0,
        likelyRealTransitLine: true,
        hasConflict: false,
      },
    },
  )

  assert.equal(result.lane, 'RED')
  assert.equal(result.autoApplyAllowed, false)
})
