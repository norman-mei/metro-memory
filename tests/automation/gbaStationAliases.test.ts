import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

import { featureMatchesManualComplexSelector } from '../../src/lib/manualComplexes.ts'
import { repairMojibakeString } from '../../src/lib/repairMojibake.ts'
import { findExactStationMatches } from '../../src/lib/stationMatching.ts'
import type { DataFeature } from '../../src/lib/types.ts'

const gbaFeaturesPath = path.join(
  process.cwd(),
  'src',
  'app',
  '(game)',
  'asia',
  'china',
  'gba',
  'data',
  'features.json',
)

const normalize = (value: string) =>
  repairMojibakeString(value)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()+]/g, ' ')
    .replace(/[\u2010-\u2015]/g, ' ')
    .replace(/\s+/g, '')
    .trim()

test('GBA Tai Koo aliases stay attached to Tai Koo and do not leak to Kornhill', () => {
  const taiKooLabel = 'Tai Koo (\u592a\u53e4)'
  const kornhillLabel = 'Kornhill (\u5eb7\u5c71)'
  const taiKooChinese = '\u592a\u53e4'
  const taiKooChineseStation = '\u592a\u53e4\u7ad9'

  const raw = fs.readFileSync(gbaFeaturesPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    features?: Array<{
      properties?: {
        name?: unknown
        long_name?: unknown
        short_name?: unknown
        alternate_names?: unknown
      }
    }>
  }

  const features = parsed.features ?? []
  const taiKoo = features.find(
    (feature) =>
      repairMojibakeString(String(feature.properties?.name ?? '')) === taiKooLabel,
  )
  const kornhill = features.find(
    (feature) =>
      repairMojibakeString(String(feature.properties?.name ?? '')) === kornhillLabel,
  )

  assert.ok(taiKoo, 'Tai Koo station should exist in GBA data')
  assert.ok(kornhill, 'Kornhill station should exist in GBA data')

  const kornhillAlternates = Array.isArray(kornhill?.properties?.alternate_names)
    ? kornhill.properties.alternate_names.map((entry) => repairMojibakeString(String(entry)))
    : []

  assert.equal(kornhillAlternates.includes('Tai Koo'), false)
  assert.equal(kornhillAlternates.includes('Tai Koo Station'), false)
  assert.equal(kornhillAlternates.includes(taiKooChinese), false)
  assert.equal(kornhillAlternates.includes(taiKooChineseStation), false)

  const exactOwners = features
    .map((feature) => {
      const properties = feature.properties ?? {}
      const primaryCandidates = [
        properties.name,
        properties.long_name,
        properties.short_name,
      ]
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map(normalize)
      const alternateCandidates = Array.isArray(properties.alternate_names)
        ? properties.alternate_names
            .filter(
              (entry): entry is string =>
                typeof entry === 'string' && entry.trim().length > 0,
            )
            .map(normalize)
        : []

      const exactStrength = primaryCandidates.includes(normalize(taiKooChinese))
        ? 2
        : alternateCandidates.includes(normalize(taiKooChinese))
          ? 1
          : 0

      return {
        name: repairMojibakeString(String(properties.name ?? '')),
        exactStrength,
      }
    })
    .filter((entry) => entry.exactStrength > 0)

  assert.deepEqual(exactOwners, [{ name: taiKooLabel, exactStrength: 1 }])
})

test('GBA exact station matching can resolve 太古 even when fuzzy search is bypassed', () => {
  const raw = fs.readFileSync(gbaFeaturesPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    features?: DataFeature[]
  }

  const matches = findExactStationMatches(
    parsed.features ?? [],
    normalize('\u592a\u53e4'),
    normalize,
    (value) => value,
  )

  assert.deepEqual(matches, [{ id: 104, exactStrength: 1 }])
})

test('GBA manual complex selectors can match Tai Koo and Kornhill by repaired alternate names', () => {
  const raw = fs.readFileSync(gbaFeaturesPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    features?: DataFeature[]
  }

  const features = parsed.features ?? []
  const taiKoo = features.find(
    (feature) =>
      repairMojibakeString(String(feature.properties?.name ?? '')) === 'Tai Koo (\u592a\u53e4)',
  )
  const kornhill = features.find(
    (feature) =>
      repairMojibakeString(String(feature.properties?.name ?? '')) === 'Kornhill (\u5eb7\u5c71)',
  )
  const taiKooShingRoad = features.find(
    (feature) =>
      repairMojibakeString(String(feature.properties?.name ?? '')) ===
      'Tai Koo Shing Road (\u592a\u53e4\u57ce\u9053)',
  )

  assert.ok(taiKoo, 'Tai Koo station should exist in GBA data')
  assert.ok(kornhill, 'Kornhill station should exist in GBA data')
  assert.ok(taiKooShingRoad, 'Tai Koo Shing Road stop should exist in GBA data')

  assert.equal(
    featureMatchesManualComplexSelector(taiKoo, { name: 'Tai Koo', line: 'ISL' }),
    true,
  )
  assert.equal(
    featureMatchesManualComplexSelector(kornhill, { name: 'Kornhill', line: 'HKT' }),
    true,
  )
  assert.equal(
    featureMatchesManualComplexSelector(taiKooShingRoad, {
      name: 'Tai Koo',
      line: 'ISL',
    }),
    false,
  )
})
