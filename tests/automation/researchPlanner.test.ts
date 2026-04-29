import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClaimPolicy } from '../../scripts/metro-sync/policy.ts'
import { buildVerificationScores } from '../../scripts/metro-sync/verify.ts'

test('buildVerificationScores recommends AI follow-up for station renames without official evidence', () => {
  const verification = buildVerificationScores({
    citySlug: 'sample-city',
    type: 'UPDATED_STATION',
    entityKey: 'line1|Old Town',
    title: 'Rename Old Town station to New Town',
    confidence: 0.81,
    diff: {
      change: 'gtfs-stop-rename',
      from: 'Old Town',
      to: 'New Town',
    },
    metadata: {
      stationLifecycle: 'rename',
    },
    sources: [
      {
        sourceType: 'search-result',
        label: 'Community writeup',
        url: 'https://example.com/station-rename',
      },
    ],
  })

  assert.equal(verification.verificationJson?.followUpRecommended, true)
  assert.ok(
    Array.isArray(verification.verificationJson?.missingEvidence) &&
      verification.verificationJson.missingEvidence.some((reason) =>
        String(reason).toLowerCase().includes('station rename'),
      ),
  )
  assert.ok(
    Array.isArray(verification.verificationJson?.recommendedTaskTypes) &&
      verification.verificationJson.recommendedTaskTypes.includes('VERIFY_STATION_RENAME'),
  )
})

test('buildVerificationScores stops recommending follow-up after research is exhausted', () => {
  const verification = buildVerificationScores({
    citySlug: 'sample-city',
    type: 'LINE_COLOR_CANDIDATE',
    entityKey: 'line1',
    title: 'Update line color',
    confidence: 0.8,
    metadata: {
      followUpStatus: 'EXHAUSTED',
    },
    afterValue: {
      color: '#112233',
    },
    sources: [
      {
        sourceType: 'official-map-pdf',
        label: 'Archived map',
        url: 'https://example.com/map.pdf',
        metadata: {
          artifactType: 'MAP_PDF',
        },
      },
    ],
  })

  assert.equal(verification.verificationJson?.followUpRecommended, false)
})

test('buildVerificationScores hard-stops on severe contradiction clusters', () => {
  const verification = buildVerificationScores({
    citySlug: 'sample-city',
    type: 'UPDATED_STATION',
    entityKey: 'line1|Old Town',
    title: 'Rename Old Town station to New Town',
    confidence: 0.79,
    metadata: {
      conflictReasons: ['Official map disagrees', 'Official press notice disagrees'],
      contradictionFlag: true,
    },
    sources: [
      {
        sourceType: 'official-page',
        label: 'Agency page',
        url: 'https://metro.example.org/stations/old-town',
        metadata: { artifactType: 'OFFICIAL_PAGE' },
      },
      {
        sourceType: 'official-press-release',
        label: 'Agency notice',
        url: 'https://metro.example.org/news/rename',
        metadata: { artifactType: 'PRESS_RELEASE' },
      },
    ],
  })

  assert.equal(verification.verificationJson?.followUpRecommended, false)
  assert.ok(
    Array.isArray(verification.verificationJson?.missingEvidence) &&
      verification.verificationJson.missingEvidence.some((reason) =>
        String(reason).toLowerCase().includes('bounded autonomy threshold'),
      ),
  )
})

test('buildClaimPolicy keeps follow-up candidates in yellow review', () => {
  const result = buildClaimPolicy(
    {
      citySlug: 'sample-city',
      type: 'NEW_STATION',
      entityKey: 'line1|Central',
      title: 'Add official station Central on line1',
      confidence: 0.89,
      metadata: { likelyRealTransitLine: true },
      sources: [
        {
          sourceType: 'gtfs-diff',
          label: 'GTFS stop Central',
          url: 'https://example.com/gtfs.zip',
          metadata: { artifactType: 'GTFS_FEED', extractedFactKind: 'STATION_REFERENCE' },
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
        officialEvidenceCount: 0,
        gtfsEvidenceCount: 1,
        likelyRealTransitLine: true,
        hasConflict: false,
        followUpRecommended: true,
        missingEvidence: ['Need a stronger official source tier for this claim.'],
      },
    },
  )

  assert.equal(result.lane, 'YELLOW')
  assert.equal(result.autoApplyAllowed, false)
})
