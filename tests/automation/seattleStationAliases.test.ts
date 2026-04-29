import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const seattleFeaturesPath = path.join(
  process.cwd(),
  'src',
  'app',
  '(game)',
  'north-america',
  'usa',
  'seattle',
  'data',
  'features.json',
)

test('Seattle Symphony entries do not accept the retired University Street name', () => {
  const raw = fs.readFileSync(seattleFeaturesPath, 'utf8')
  const parsed = JSON.parse(raw) as {
    features?: Array<{
      properties?: {
        name?: unknown
        alternate_names?: unknown
      }
    }>
  }

  const symphonyEntries = (parsed.features ?? []).filter(
    (feature) => feature.properties?.name === 'Symphony',
  )

  assert.ok(symphonyEntries.length > 0)

  symphonyEntries.forEach((feature) => {
    const alternates = Array.isArray(feature.properties?.alternate_names)
      ? feature.properties.alternate_names
      : []

    assert.equal(alternates.includes('University Street'), false)
  })
})
