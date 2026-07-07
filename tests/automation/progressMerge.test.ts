import test from 'node:test'
import assert from 'node:assert/strict'

import { mergeProgressPayloads } from '../../src/lib/progressMerge.ts'

test('merge unions found ids from both sides and dedupes', () => {
  const merged = mergeProgressPayloads(
    { foundIds: [1, 2, 2] },
    { foundIds: [2, 3] },
  )

  assert.deepEqual([...merged.foundIds].sort((a, b) => a - b), [1, 2, 3])
})

test('merge treats null/undefined sides as empty', () => {
  assert.deepEqual(mergeProgressPayloads(null, null), {
    foundIds: [],
    foundTimestamps: {},
  })

  assert.deepEqual(
    mergeProgressPayloads(undefined, { foundIds: [7] }).foundIds,
    [7],
  )
})

test('merge drops non-finite and non-number ids', () => {
  const merged = mergeProgressPayloads(
    { foundIds: [1, Number.NaN, Infinity] as number[] },
    { foundIds: ['x' as unknown as number, 4] },
  )

  assert.deepEqual([...merged.foundIds].sort((a, b) => a - b), [1, 4])
})

test('merge keeps the earliest timestamp when both sides have one', () => {
  const merged = mergeProgressPayloads(
    { foundIds: [1], foundTimestamps: { '1': '2026-01-02T00:00:00.000Z' } },
    { foundIds: [1], foundTimestamps: { '1': '2026-01-01T00:00:00.000Z' } },
  )

  assert.equal(merged.foundTimestamps?.['1'], '2026-01-01T00:00:00.000Z')
})

test('merge carries a timestamp present on only one side', () => {
  const merged = mergeProgressPayloads(
    { foundIds: [1], foundTimestamps: { '1': '2026-01-05T00:00:00.000Z' } },
    { foundIds: [1, 2] },
  )

  assert.equal(merged.foundTimestamps?.['1'], '2026-01-05T00:00:00.000Z')
})

test('merge discards timestamps whose id is not in the found set', () => {
  const merged = mergeProgressPayloads(
    { foundIds: [1], foundTimestamps: { '99': '2026-01-01T00:00:00.000Z' } },
    { foundIds: [1] },
  )

  assert.deepEqual(merged.foundTimestamps, {})
})

test('merge ignores non-string timestamp values', () => {
  const merged = mergeProgressPayloads(
    {
      foundIds: [1],
      foundTimestamps: { '1': 123 as unknown as string },
    },
    { foundIds: [1] },
  )

  assert.deepEqual(merged.foundTimestamps, {})
})
