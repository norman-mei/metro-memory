import test from 'node:test'
import assert from 'node:assert/strict'

import {
  classifyImageSourcePolicy,
  normalizeHexColor,
  resolvePreferredLineColor,
} from '../../scripts/metro-sync/reviewHelpers.ts'

test('normalizeHexColor expands shorthand and uppercases', () => {
  assert.equal(normalizeHexColor('#abc'), '#AABBCC')
  assert.equal(normalizeHexColor('00ff00'), '#00FF00')
  assert.equal(normalizeHexColor('invalid'), null)
})

test('classifyImageSourcePolicy blocks social repost domains', () => {
  const policy = classifyImageSourcePolicy('https://www.pinterest.com/pin/123', {})
  assert.equal(policy.status, 'BLOCKED')
  assert.equal(policy.licenseStatus, 'PROHIBITED')
  assert.equal(policy.autoApplyEligible, false)
})

test('classifyImageSourcePolicy prefers official-like transit domains', () => {
  const policy = classifyImageSourcePolicy('https://www.metro.example.com/assets/map.png', {
    title: 'Official Metro Map',
    source: 'Metro Authority',
  })
  assert.equal(policy.status, 'PREFERRED')
  assert.equal(policy.licenseStatus, 'CLEAR')
  assert.equal(policy.autoApplyEligible, true)
})

test('classifyImageSourcePolicy marks wikimedia sources as attribution required', () => {
  const policy = classifyImageSourcePolicy(
    'https://upload.wikimedia.org/example/line-icon.png',
    {
      title: 'Line icon',
      source: 'Wikimedia Commons',
    },
  )
  assert.equal(policy.status, 'PREFERRED')
  assert.equal(policy.licenseStatus, 'ATTRIBUTION_REQUIRED')
})

test('resolvePreferredLineColor keeps OSM color when extracted sample is far off', () => {
  assert.equal(resolvePreferredLineColor('#FFFFFF', '#FF0000'), '#FF0000')
})

test('resolvePreferredLineColor keeps extracted color when it is close to OSM', () => {
  assert.equal(resolvePreferredLineColor('#F01010', '#FF0000'), '#F01010')
  assert.equal(resolvePreferredLineColor(null, '#0055AA'), '#0055AA')
  assert.equal(resolvePreferredLineColor(null, null), '#888888')
})
