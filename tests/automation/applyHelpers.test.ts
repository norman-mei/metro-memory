import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDraftLineGroupUpdate,
  applyInlineLinesExportUpdate,
  buildLineRecord,
  configUsesLinesData,
  extractInlineConfiguredLines,
  findBootstrapRegistryLineMatch,
} from '../../src/lib/automationApplyHelpers.ts'

test('configUsesLinesData detects data-driven configs', () => {
  assert.equal(
    configUsesLinesData("import linesData from './data/lines.json'\nexport const LINES = linesData"),
    true,
  )
  assert.equal(configUsesLinesData('export const LINES = {}'), false)
})

test('applyDraftLineGroupUpdate appends to existing automation draft group', () => {
  const source = `export const LINE_GROUPS = [
  {
    title: 'Automation Draft',
    items: [
      {
        type: 'lines',
        title: 'Review queue',
        lines: ['existingLine'],
      },
    ],
  },
]`

  const result = applyDraftLineGroupUpdate(source, 'newLine')
  assert.equal(result.changed, true)
  assert.match(result.nextSource, /lines: \['existingLine', 'newLine'\]/)
})

test('applyDraftLineGroupUpdate creates automation draft group when missing', () => {
  const source = `export const LINE_GROUPS = [
  {
    title: 'Metro',
    items: [
      {
        type: 'lines',
        lines: ['lineA'],
      },
    ],
  },
]`

  const result = applyDraftLineGroupUpdate(source, 'lineB')
  assert.equal(result.changed, true)
  assert.match(result.nextSource, /title: 'Automation Draft'/)
  assert.match(result.nextSource, /lines: \['lineB'\]/)
})

test('applyInlineLinesExportUpdate inserts a new inline line definition', () => {
  const source = `import { Line } from '@/lib/types'

export const LINES: Record<string, Line> = {
  existingLine: {
    name: 'Existing',
    color: '#123456',
    backgroundColor: '#0F0F0F',
    textColor: '#FFFFFF',
    order: 1,
  },
}
`

  const lineRecord = buildLineRecord(
    {
      name: 'New Line',
      color: '#FF6600',
      backgroundColor: '#AA4400',
      textColor: '#FFFFFF',
      order: 2,
      icon: 'north-america/usa/test/NewLine.png',
    },
    2,
  )

  assert.ok(lineRecord)

  const result = applyInlineLinesExportUpdate(source, 'newLine', lineRecord!)
  assert.equal(result.changed, true)
  assert.match(result.nextSource, /newLine: \{/)
  assert.match(result.nextSource, /name: 'New Line'/)
  assert.match(result.nextSource, /icon: 'north-america\/usa\/test\/NewLine\.png'/)
})

test('applyInlineLinesExportUpdate skips duplicate inline entries', () => {
  const source = `export const LINES = {
  duplicated: {
    name: 'Duplicated',
    color: '#000000',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    order: 1,
  },
}`

  const lineRecord = buildLineRecord({ name: 'Duplicated', color: '#000000' }, 1)
  assert.ok(lineRecord)

  const result = applyInlineLinesExportUpdate(source, 'duplicated', lineRecord!)
  assert.equal(result.changed, false)
  assert.match(result.note, /already present/)
})

test('extractInlineConfiguredLines reads inline line ids and names', () => {
  const source = `export const LINES = {
  taizhous1: {
    name: 'S1',
    color: '#0061AE',
    backgroundColor: '#004B86',
    textColor: '#ffffff',
    order: 1,
  },
  wenzhous2: {
    name: 'S2',
    color: '#E4002B',
    backgroundColor: '#B00022',
    textColor: '#ffffff',
    order: 2,
  },
}`

  const lines = extractInlineConfiguredLines(source)
  assert.deepEqual(lines, [
    { id: 'taizhous1', name: 'S1', order: 1 },
    { id: 'wenzhous2', name: 'S2', order: 2 },
  ])
})

test('findBootstrapRegistryLineMatch maps bootstrap candidates onto existing inline lines', () => {
  const source = `export const LINES: Record<string, any> = {
  nanning1: {
    name: 'Line 1',
    color: '#00B04F',
    backgroundColor: '#00843d',
    textColor: '#ffffff',
    order: 1,
  },
  nanning5: {
    name: 'Line 5',
    color: '#0057A3',
    backgroundColor: '#003f74',
    textColor: '#ffffff',
    order: 5,
  },
}`

  const match = findBootstrapRegistryLineMatch(source, {}, {
    id: 'NanningLine1NanningRailTransit',
    name: 'Line 1, Nanning Rail Transit',
    keywords: ['Line 1', '1号线', 'Nanning Rail Transit Line 1'],
    routeSample: {
      ref: '1',
      name: '南宁轨道交通1号线（石埠-->火车东站）',
      'name:en': 'Line 1, Nanning Rail Transit',
    },
  })

  assert.deepEqual(match, { id: 'nanning1', name: 'Line 1', order: 1 })
})

test('findBootstrapRegistryLineMatch maps bootstrap candidates onto data-driven lines', () => {
  const match = findBootstrapRegistryLineMatch(
    '',
    {
      xiamen1: { name: 'Line 1', order: 1 },
      xiamen2: { name: 'Line 2', order: 2 },
    },
    {
      id: 'XiamenXiamenMetroLine2',
      name: 'Xiamen Metro Line 2',
      keywords: ['Xiamen Metro Line 2', 'Line 2'],
    },
  )

  assert.deepEqual(match, { id: 'xiamen2', name: 'Line 2', order: 2 })
})

test('findBootstrapRegistryLineMatch understands metro and U-Bahn style refs', () => {
  const parisMatch = findBootstrapRegistryLineMatch(
    `export const LINES = {
  'METRO 1': { name: 'METRO 1', order: 1 },
  'METRO 3bis': { name: 'METRO 3bis', order: 3.5 },
}`,
    {},
    {
      id: 'ParisMetro1',
      name: 'Métro 1',
      routeSample: { ref: '1' },
    },
  )

  assert.deepEqual(parisMatch, { id: 'METRO 1', name: 'METRO 1', order: 1 })

  const berlinMatch = findBootstrapRegistryLineMatch(
    `export const LINES = {
  U3: { name: 'U3', order: 3 },
  S41: { name: 'S41', order: 41 },
}`,
    {},
    {
      id: 'BerlinU3',
      name: 'U3',
      routeSample: { ref: 'U3' },
    },
  )

  assert.deepEqual(berlinMatch, { id: 'U3', name: 'U3', order: 3 })
})
