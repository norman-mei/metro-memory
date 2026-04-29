import test from 'node:test'
import assert from 'node:assert/strict'

import { clusterReviewCandidates } from '../../scripts/metro-sync/candidateClustering.ts'

test('clusterReviewCandidates collapses directional duplicate line proposals', () => {
  const result = clusterReviewCandidates([
    {
      citySlug: 'london',
      type: 'NEW_LINE',
      entityKey: 'line-a-east',
      title: 'Review new line candidate Central Line eastbound',
      confidence: 0.61,
      afterValue: { id: 'line-a-east', name: 'Central Line Eastbound' },
      metadata: {},
      sources: [{ sourceType: 'osm', label: 'OSM' }],
    },
    {
      citySlug: 'london',
      type: 'NEW_LINE',
      entityKey: 'line-a-west',
      title: 'Review new line candidate Central Line westbound',
      confidence: 0.67,
      afterValue: { id: 'line-a-west', name: 'Central Line Westbound' },
      metadata: {},
      sources: [{ sourceType: 'official-line_reference', label: 'Official' }],
    },
  ])

  assert.equal(result.candidates.length, 1)
  assert.equal(result.clusteredDuplicateCount, 1)
  assert.equal(result.candidates[0].metadata?.clusterSize, 2)
  assert.equal(result.candidates[0].sources.length, 2)
})

test('clusterReviewCandidates collapses branch and via variants into one group', () => {
  const result = clusterReviewCandidates([
    {
      citySlug: 'paris',
      type: 'NEW_LINE',
      entityKey: 'm1-via-defense',
      title: 'Review new line candidate Metro 1 via La Defense',
      confidence: 0.61,
      afterValue: { id: 'm1-via-defense', name: 'Metro 1 via La Defense' },
      metadata: {},
      sources: [{ sourceType: 'osm', label: 'OSM' }],
    },
    {
      citySlug: 'paris',
      type: 'NEW_LINE',
      entityKey: 'm1-loop',
      title: 'Review new line candidate Metro 1 (Loop)',
      confidence: 0.67,
      afterValue: { id: 'm1-loop', name: 'Metro 1 (Loop)' },
      metadata: {},
      sources: [{ sourceType: 'official-line_reference', label: 'Official' }],
    },
  ])

  assert.equal(result.candidates.length, 1)
  assert.equal(result.clusteredDuplicateCount, 1)
  assert.equal(result.candidates[0].metadata?.clusterSize, 2)
  assert.equal(result.candidates[0].sources.length, 2)
})
