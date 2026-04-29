import test from 'node:test'
import assert from 'node:assert/strict'

import { drainPendingClaimResearchWorkWithExecutor } from '../../src/lib/automationResearchDrain.ts'

test('drainPendingClaimResearchWorkWithExecutor drains until runnable work reaches zero', async () => {
  const executions = [
    { processedCount: 2, runIds: ['run-1'] },
    { processedCount: 1, runIds: ['run-1', 'run-2'] },
    { processedCount: 0, runIds: [] },
  ]
  const runnableCounts = [3, 1, 0]

  const result = await drainPendingClaimResearchWorkWithExecutor({
    executeRuns: async () => executions.shift() || { processedCount: 0, runIds: [] },
    countRunnableRuns: async () => runnableCounts.shift() ?? 0,
    maxRounds: 8,
  })

  assert.equal(result.processedCount, 3)
  assert.deepEqual(result.runIds.sort(), ['run-1', 'run-2'])
  assert.deepEqual(
    result.rounds.map((round) => round.runnableRemaining),
    [3, 1, 0],
  )
})

test('drainPendingClaimResearchWorkWithExecutor stops when a round processes nothing', async () => {
  let executeCalls = 0
  let countCalls = 0
  const result = await drainPendingClaimResearchWorkWithExecutor({
    executeRuns: async () => {
      executeCalls += 1
      return { processedCount: 0, runIds: [] }
    },
    countRunnableRuns: async () => {
      countCalls += 1
      return 4
    },
    maxRounds: 8,
  })

  assert.equal(result.processedCount, 0)
  assert.equal(result.rounds.length, 1)
  assert.equal(executeCalls, 1)
  assert.equal(countCalls, 1)
})
