import {
  drainPendingClaimResearchWork,
} from './research'

async function main() {
  const runArg = process.argv.find((value) => value.startsWith('--run='))
  const limitArg = process.argv.find((value) => value.startsWith('--limit='))
  const maxRoundsArg = process.argv.find((value) => value.startsWith('--max-rounds='))
  const runId = runArg ? runArg.slice('--run='.length) : undefined
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 8
  const maxRounds = maxRoundsArg ? Number(maxRoundsArg.slice('--max-rounds='.length)) : 8

  const result = await drainPendingClaimResearchWork({
    ...(runId ? { parentRunId: runId } : {}),
    ...(Number.isFinite(limit) && limit > 0 ? { limit } : {}),
    ...(Number.isFinite(maxRounds) && maxRounds > 0 ? { maxRounds } : {}),
  })

  console.log(JSON.stringify({ runId: runId || null, rounds: result.rounds }, null, 2))
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
