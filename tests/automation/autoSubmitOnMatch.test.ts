import test from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_AUTO_SUBMIT_ON_MATCH } from '../../src/lib/guessInputDefaults.ts'
import {
  findExactStationMatches,
  shouldAutoSubmitStationInput,
} from '../../src/lib/stationMatching.ts'
import type { DataFeature } from '../../src/lib/types.ts'

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()

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

test('auto submit is disabled by default', () => {
  assert.equal(DEFAULT_AUTO_SUBMIT_ON_MATCH, false)
})

test('auto submit only triggers on exact matches', () => {
  const features = [
    pointFeature(104, 'Tai Koo (太古)', ['Tai Koo', '太古', '太古站']),
  ]

  assert.equal(
    shouldAutoSubmitStationInput({
      features,
      rawInput: '太古',
      normalizeValue: normalize,
      stripOptionalPrefixes: (value) => value,
    }),
    true,
  )

  assert.equal(
    shouldAutoSubmitStationInput({
      features,
      rawInput: 'tai ko',
      normalizeValue: normalize,
      stripOptionalPrefixes: (value) => value,
    }),
    false,
  )
})

test('auto submit stays off while IME composition is active', () => {
  const features = [
    pointFeature(104, 'Tai Koo (太古)', ['Tai Koo', '太古', '太古站']),
  ]

  assert.equal(
    shouldAutoSubmitStationInput({
      features,
      rawInput: '太古',
      normalizeValue: normalize,
      stripOptionalPrefixes: (value) => value,
      isComposing: true,
    }),
    false,
  )
})

test('NYC prefixed airport terminals keep old inputs without EWR numeric aliases', () => {
  const features = [
    pointFeature(1807, 'EWR Terminal A', [
      'Terminal A',
      'Newark Terminal A',
      'Newark Airport Terminal A',
    ]),
    pointFeature(1820, 'JFK Terminal 1', ['Terminal 1']),
  ]

  assert.deepEqual(
    findExactStationMatches(
      features,
      normalize('terminal 1'),
      normalize,
      (value) => value,
    ).map((match) => match.id),
    [1820],
  )

  assert.equal(
    shouldAutoSubmitStationInput({
      features,
      rawInput: 'terminal 1',
      normalizeValue: normalize,
      stripOptionalPrefixes: (value) => value,
    }),
    true,
  )

  assert.deepEqual(
    findExactStationMatches(
      features,
      normalize('terminal a'),
      normalize,
      (value) => value,
    ).map((match) => match.id),
    [1807],
  )
})
