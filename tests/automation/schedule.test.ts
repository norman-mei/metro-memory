import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveRegistryResearchPlan } from '../../scripts/metro-sync/schedule.ts'

test('resolveRegistryResearchPlan prioritizes larger systems into higher tiers', () => {
  const tier1 = resolveRegistryResearchPlan(
    {
      city: 'mega-city',
      bbox: [0, 0, 1, 1],
      lines: Array.from({ length: 10 }, (_, index) => ({
        id: `L${index}`,
        name: `Line ${index}`,
        keywords: ['x'],
      })),
    },
    new Date('2026-04-01T00:00:00Z'),
    'batch',
  )

  const tier2 = resolveRegistryResearchPlan(
    {
      city: 'mid-city',
      bbox: [0, 0, 1, 1],
      lines: Array.from({ length: 5 }, (_, index) => ({
        id: `L${index}`,
        name: `Line ${index}`,
        keywords: ['x'],
      })),
    },
    new Date('2026-04-01T00:00:00Z'),
    'batch',
  )

  const tier3 = resolveRegistryResearchPlan(
    {
      city: 'small-city',
      bbox: [0, 0, 1, 1],
      lines: Array.from({ length: 2 }, (_, index) => ({
        id: `L${index}`,
        name: `Line ${index}`,
        keywords: ['x'],
      })),
    },
    new Date('2026-04-01T00:00:00Z'),
    'batch',
  )

  assert.equal(tier1.tier, 'tier1')
  assert.equal(tier1.cadenceMonths, 1)
  assert.equal(tier2.tier, 'tier2')
  assert.equal(tier2.cadenceMonths, 3)
  assert.equal(tier3.tier, 'tier3')
  assert.equal(tier3.cadenceMonths, 6)
})

test('resolveRegistryResearchPlan respects forced all mode and stable batch slots', () => {
  const registry = {
    city: 'batched-city',
    bbox: [0, 0, 1, 1] as [number, number, number, number],
    lines: Array.from({ length: 4 }, (_, index) => ({
      id: `L${index}`,
      name: `Line ${index}`,
      keywords: ['x'],
    })),
  }

  const batchPlanA = resolveRegistryResearchPlan(
    registry,
    new Date('2026-04-01T00:00:00Z'),
    'batch',
  )
  const batchPlanB = resolveRegistryResearchPlan(
    registry,
    new Date('2026-05-01T00:00:00Z'),
    'batch',
  )
  const allPlan = resolveRegistryResearchPlan(
    registry,
    new Date('2026-04-01T00:00:00Z'),
    'all',
  )

  assert.equal(batchPlanA.batchSlot, batchPlanB.batchSlot)
  assert.equal(allPlan.deepResearchDue, true)
})
