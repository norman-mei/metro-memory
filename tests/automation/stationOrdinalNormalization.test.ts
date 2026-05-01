import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateOrdinalNumberAlternates,
  normalizeString,
} from '../../src/lib/normalizeStationString.ts'
import { shouldAutoSubmitStationInput } from '../../src/lib/stationMatching.ts'
import type { DataFeature } from '../../src/lib/types.ts'

const pointFeature = (
  id: number,
  name: string,
  alternateNames: string[] = [],
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
    alternate_names: alternateNames,
  },
})

test('ordinal suffixes are optional during normalization', () => {
  const normalizeChicago = normalizeString('chicago')
  const normalizeNyc = normalizeString('nyc')

  assert.equal(normalizeChicago('54th St'), normalizeChicago('54 st'))
  assert.equal(normalizeChicago('54th Street'), normalizeChicago('54 St'))
  assert.equal(normalizeNyc('36 St'), normalizeNyc('36th st'))
})

test('ordinal alternate generation works in both directions', () => {
  assert.deepEqual(generateOrdinalNumberAlternates('54th St').sort(), ['54 St'])
  assert.deepEqual(generateOrdinalNumberAlternates('36 St').sort(), ['36th St'])
  assert.deepEqual(generateOrdinalNumberAlternates('102 Ave').sort(), ['102nd Ave'])
})

test('auto submit accepts street-number guesses with or without ordinal suffixes', () => {
  const normalizeChicago = normalizeString('chicago')
  const normalizeNyc = normalizeString('nyc')

  assert.equal(
    shouldAutoSubmitStationInput({
      features: [pointFeature(1, '54th St')],
      rawInput: '54 st',
      normalizeValue: normalizeChicago,
      stripOptionalPrefixes: (value) => value,
    }),
    true,
  )

  assert.equal(
    shouldAutoSubmitStationInput({
      features: [pointFeature(2, '36 St')],
      rawInput: '36th st',
      normalizeValue: normalizeNyc,
      stripOptionalPrefixes: (value) => value,
    }),
    true,
  )
})
