import test from 'node:test'
import assert from 'node:assert/strict'

import {
  autoClusterAliasSetsOverlap,
  buildAutoClusterAliases,
} from '../../src/lib/stationComplexes.ts'
import type { DataFeature } from '../../src/lib/types.ts'

const normalizeValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const pointFeature = (
  id: number,
  name: string,
  extras: Partial<DataFeature['properties']> = {},
): DataFeature => ({
  type: 'Feature',
  id,
  geometry: {
    type: 'Point',
    coordinates: [0, 0],
  },
  properties: {
    name,
    line: 'test-line',
    ...extras,
  },
})

test('buildAutoClusterAliases collapses directional platform suffixes', () => {
  const eastbound = buildAutoClusterAliases(
    pointFeature(1, 'Providence Park EB'),
    normalizeValue,
  )
  const westbound = buildAutoClusterAliases(
    pointFeature(2, 'Providence Park WB'),
    normalizeValue,
  )

  assert.equal(autoClusterAliasSetsOverlap(eastbound, westbound), true)
})

test('buildAutoClusterAliases reuses parenthetical station names', () => {
  const first = buildAutoClusterAliases(
    pointFeature(1, 'Main Street (U)'),
    normalizeValue,
  )
  const second = buildAutoClusterAliases(
    pointFeature(2, 'Main Street'),
    normalizeValue,
  )

  assert.equal(autoClusterAliasSetsOverlap(first, second), true)
})

test('buildAutoClusterAliases matches slash-separated complex names to base names', () => {
  const complex = buildAutoClusterAliases(
    pointFeature(1, 'Civic Center/UN Plaza'),
    normalizeValue,
  )
  const base = buildAutoClusterAliases(pointFeature(2, 'Civic Center'), normalizeValue)

  assert.equal(autoClusterAliasSetsOverlap(complex, base), true)
})

test('buildAutoClusterAliases does not merge unrelated nearby station names', () => {
  const first = buildAutoClusterAliases(
    pointFeature(1, 'Chambers St'),
    normalizeValue,
  )
  const second = buildAutoClusterAliases(
    pointFeature(2, 'Brooklyn Bridge - City Hall'),
    normalizeValue,
  )

  assert.equal(autoClusterAliasSetsOverlap(first, second), false)
})
