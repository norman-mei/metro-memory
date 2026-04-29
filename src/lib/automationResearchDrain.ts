export async function drainPendingClaimResearchWorkWithExecutor({
  executeRuns,
  countRunnableRuns,
  parentRunId,
  citySlugs,
  claimTypes,
  limit = 8,
  maxRounds = 8,
  autoApplyGreen = false,
}: {
  executeRuns: (input: {
    parentRunId?: string
    citySlugs?: string[]
    claimTypes?: string[]
    limit?: number
    autoApplyGreen?: boolean
  }) => Promise<{ processedCount: number; runIds: string[] }>
  countRunnableRuns: (input?: { parentRunId?: string }) => Promise<number>
  parentRunId?: string
  citySlugs?: string[]
  claimTypes?: string[]
  limit?: number
  maxRounds?: number
  autoApplyGreen?: boolean
}) {
  const rounds: Array<{ round: number; processedCount: number; runnableRemaining: number }> = []
  let processedCount = 0
  const runIds = new Set<string>()

  for (let round = 1; round <= maxRounds; round += 1) {
    const result = await executeRuns({
      parentRunId,
      citySlugs,
      claimTypes,
      limit,
      autoApplyGreen,
    })
    const runnableRemaining = await countRunnableRuns(parentRunId ? { parentRunId } : {})
    processedCount += result.processedCount
    result.runIds.forEach((runId) => runIds.add(runId))
    rounds.push({
      round,
      processedCount: result.processedCount,
      runnableRemaining,
    })

    if (result.processedCount === 0 || runnableRemaining === 0) {
      break
    }
  }

  return {
    processedCount,
    runIds: Array.from(runIds),
    rounds,
  }
}
