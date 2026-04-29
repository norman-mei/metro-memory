import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAutomationClaimResearchState } from '../../src/lib/automationClaimState.ts'

test('buildAutomationClaimResearchState blocks claims at the contradiction threshold', () => {
  const state = buildAutomationClaimResearchState({
    lane: 'YELLOW',
    autoApplyEligible: false,
    verificationJson: {
      contradictionFlag: true,
      contradictionScore: 0.81,
      officialEvidenceCount: 2,
      gtfsEvidenceCount: 0,
      followUpRecommended: true,
      missingEvidence: ['Resolve contradictory evidence'],
    },
    tasks: [
      {
        id: 'task-1',
        taskType: 'VERIFY_STATION_RENAME',
        status: 'EXHAUSTED',
        retryCount: 2,
      },
    ],
    researchRuns: [{ id: 'run-1', status: 'RUNNING', attemptNumber: 2 }],
  })

  assert.equal(state.status, 'BLOCKED')
  assert.ok(state.stopReasons.includes('contradiction_threshold_reached'))
})

test('buildAutomationClaimResearchState exhausts claims that never find official evidence', () => {
  const state = buildAutomationClaimResearchState({
    lane: 'YELLOW',
    autoApplyEligible: false,
    verificationJson: {
      contradictionFlag: false,
      contradictionScore: 0.05,
      officialEvidenceCount: 0,
      gtfsEvidenceCount: 0,
      followUpRecommended: true,
      missingEvidence: ['Need official evidence'],
    },
    tasks: [
      {
        id: 'task-1',
        taskType: 'FIND_PRESS_PAGE',
        status: 'EXHAUSTED',
        retryCount: 2,
      },
    ],
    researchRuns: [{ id: 'run-1', status: 'EXHAUSTED', attemptNumber: 4 }],
    maxResearchRunAttempts: 4,
  })

  assert.equal(state.status, 'EXHAUSTED')
  assert.ok(state.stopReasons.includes('insufficient_official_evidence'))
})
