import test from 'node:test'
import assert from 'node:assert/strict'

import { buildBootstrapLineProposals, discoverBootstrapLineSeeds } from '../../scripts/metro-sync/bootstrap.ts'

test('discoverBootstrapLineSeeds finds unknown OSM routes for line-less registries', () => {
  const registry = {
    city: 'sample-city',
    bbox: [0, 0, 1, 1] as [number, number, number, number],
    localLanguages: ['en'],
    lines: [],
  }

  const seeds = discoverBootstrapLineSeeds(registry, [
    {
      properties: {
        name: 'Line 1',
        'name:en': 'Line 1',
        colour: '#ff0000',
      },
    },
    {
      properties: {
        name: 'Line 1',
        colour: '#ff0000',
      },
    },
    {
      properties: {
        name: 'Airport Express',
      },
    },
  ])

  assert.equal(seeds.length, 2)
  assert.deepEqual(
    seeds.map((seed) => seed.name),
    ['Airport Express', 'Line 1'],
  )
})

test('buildBootstrapLineProposals generates ids, colors, and keywords', () => {
  const proposals = buildBootstrapLineProposals({
    registry: {
      city: 'sample-city',
      bbox: [0, 0, 1, 1],
      localLanguages: ['en'],
      lines: [],
    },
    lineFeatures: [
      {
        properties: {
          name: 'Line 2',
          colour: '#00aa00',
          operator: 'Metro Sample',
        },
      },
    ],
  })

  assert.equal(proposals.length, 1)
  assert.equal(proposals[0].name, 'Line 2')
  assert.equal(proposals[0].color, '#00AA00')
  assert.ok(proposals[0].id.startsWith('SampleCityLine2'))
  assert.ok(proposals[0].keywords.includes('Line 2'))
  assert.ok(proposals[0].keywords.includes('2号线'))
})
