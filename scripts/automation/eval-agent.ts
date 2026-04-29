import { AutomationAgentEventType, PrismaClient } from '@prisma/client'

import {
  runAutomationAgentEvalHarness,
  runAutomationAgentReplayEval,
} from '../../src/lib/automationAgentEval'

async function main() {
  const prisma = new PrismaClient()
  const label =
    process.argv.find((entry) => entry.startsWith('--label='))?.slice('--label='.length) ||
    `agent-eval-${new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '')}`
  const limit = Math.max(
    1,
    Number(
      process.argv.find((entry) => entry.startsWith('--limit='))?.slice('--limit='.length) || '30',
    ) || 30,
  )

  try {
    const [synthetic, replay] = await Promise.all([
      Promise.resolve(runAutomationAgentEvalHarness()),
      runAutomationAgentReplayEval({ limit }),
    ])
    const summary = {
      synthetic,
      replay,
    }
    const evalRun = await prisma.automationEvalRun.create({
      data: {
        label,
        requestedBy: process.env.USER || process.env.AUTOMATION_ADMIN_LABEL || 'automation-cli',
        inputJson: {
          kind: 'agent-replay-harness',
          limit,
        },
        summaryJson: summary,
      },
    })
    await prisma.automationAgentEvent.create({
      data: {
        eventType: AutomationAgentEventType.REPLAY_EVAL_RECORDED,
        createdBy: process.env.USER || process.env.AUTOMATION_ADMIN_LABEL || 'automation-cli',
        summaryJson: {
          label,
          evalRunId: evalRun.id,
          replayPassRate: replay.passRate,
          replayTotal: replay.total,
        },
      },
    })
    console.log(JSON.stringify({ label, ...summary }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
