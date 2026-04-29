import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateLineKeywords,
  mergeRegistryLines,
} from '../../scripts/metro-sync/registryCoverage.ts'

test('generateLineKeywords expands common numeric and named line variants', () => {
  const line1Keywords = generateLineKeywords({
    id: 'Line1',
    name: 'Line 1',
    keywords: [],
  })
  const redKeywords = generateLineKeywords({
    id: 'MBTATMetroRedLine',
    name: 'Red',
    keywords: [],
  })

  assert.ok(line1Keywords.includes('Line 1'))
  assert.ok(line1Keywords.includes('1号线'))
  assert.ok(line1Keywords.includes('地铁1号线'))
  assert.ok(redKeywords.includes('Red'))
  assert.ok(redKeywords.includes('Red Line'))
})

test('mergeRegistryLines backfills missing game-data lines and preserves manual keywords', () => {
  const merged = mergeRegistryLines(
    [
      {
        id: 'Line1',
        name: 'Line 1',
        keywords: ['Manual Local Name'],
        order: 1,
      },
    ],
    [
      {
        id: 'Line1',
        name: 'Line 1',
        keywords: ['Line 1', '1号线'],
        order: 1,
      },
      {
        id: 'Line2',
        name: 'Line 2',
        keywords: ['Line 2'],
        order: 2,
      },
    ],
  )

  assert.equal(merged.length, 2)
  assert.deepEqual(
    merged.map((line) => line.id),
    ['Line1', 'Line2'],
  )
  assert.ok(merged[0].keywords.includes('Manual Local Name'))
  assert.ok(merged[0].keywords.includes('1号线'))
  assert.ok(merged[1].keywords.includes('Line 2'))
})
