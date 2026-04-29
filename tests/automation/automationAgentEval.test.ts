import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evaluateExplainReplyCase,
  evaluateFalsePositiveGuardCase,
  evaluateFollowUpImprovementCase,
  evaluateMessageGraphCase,
  evaluateOperatorRoutingCase,
  runAutomationAgentEvalHarness,
} from '../../src/lib/automationAgentEval.ts'

test('evaluateExplainReplyCase requires reason, missing evidence, and next action fragments', () => {
  const result = evaluateExplainReplyCase({
    name: 'explain',
    reply: 'Why: blocked\nMissing evidence: official notice\nNext action: fetch map',
    requiredFragments: ['why:', 'missing evidence:', 'next action:'],
  })

  assert.equal(result.passed, true)
})

test('evaluateOperatorRoutingCase checks mode, cities, and claim types', () => {
  const summary = runAutomationAgentEvalHarness()
  const routingCase = summary.results.find((result) =>
    result.name === 'targeted_research_selects_city_and_station_claims')

  assert.ok(routingCase)
  assert.equal(routingCase?.passed, true)
})

test('evaluateFollowUpImprovementCase expects yellow claims to drop', () => {
  const result = evaluateFollowUpImprovementCase({
    name: 'followup',
    beforeYellowCount: 3,
    afterYellowCount: 1,
    beforeGreenCount: 0,
    afterGreenCount: 1,
  })

  assert.equal(result.passed, true)
})

test('evaluateFalsePositiveGuardCase flags unsafe green-lane approvals', () => {
  const result = evaluateFalsePositiveGuardCase({
    name: 'false-positive-guard',
    lane: 'GREEN',
    autoApplyAllowed: true,
    humanOutcome: 'REJECT',
  })

  assert.equal(result.passed, false)
})

test('evaluateMessageGraphCase validates branch lineage and ancestors', () => {
  const result = evaluateMessageGraphCase({
    messages: [
      { id: 'm1', branchId: 'main', parentMessageId: null, content: 'root' },
      { id: 'm2', branchId: 'branch-x', parentMessageId: 'm1', content: 'branch prompt' },
    ],
    targetMessageId: 'm2',
    expectedBranchId: 'branch-x',
    expectedAncestorIds: ['m1'],
  })

  assert.equal(result.passed, true)
})

test('runAutomationAgentEvalHarness returns a non-empty summary', () => {
  const summary = runAutomationAgentEvalHarness()

  assert.ok(summary.total >= 6)
  assert.equal(summary.failed, 0)
})
