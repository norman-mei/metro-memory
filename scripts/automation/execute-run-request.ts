import {
  AutomationAgentOutcomeType,
  AutomationApplyPolicy,
  AutomationRunRequestMode,
  AutomationRunRequestStatus,
  PrismaClient,
} from '@prisma/client'

import { buildAutomationExplainReply } from '../../src/lib/automationExplain'
import { recordAutomationAgentOutcome } from '../../src/lib/automationRunRequests'
import { executePendingResearchRuns } from '../metro-sync/research'
import { runMetroSyncJob, type MetroSyncJobOptions } from '../metro-sync/run'

type RunRequestRecord = Awaited<
  ReturnType<PrismaClient['automationRunRequest']['findUnique']>
>

function parseStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter(Boolean)
    : []
}

function getBaseContext(request: RunRequestRecord) {
  return request?.contextJson && typeof request.contextJson === 'object'
    ? (request.contextJson as Record<string, any>)
    : {}
}

function buildSyncOptions(
  request: NonNullable<RunRequestRecord>,
  citySlugs: string[],
  claimTypes: string[],
): MetroSyncJobOptions {
  return {
    scope: request.scope || 'all',
    explicitCities: citySlugs,
    claimTypes,
    deepResearchMode:
      request.mode === AutomationRunRequestMode.TARGETED_RESEARCH ||
      request.mode === AutomationRunRequestMode.MANUAL_UPDATE
        ? 'all'
        : 'batch',
    autoApplyGreen:
      request.applyPolicy === AutomationApplyPolicy.AUTO_APPLY_GREEN_ONLY,
  }
}

async function executeExplainMode(request: NonNullable<RunRequestRecord>) {
  const citySlugs = parseStringList(request.citySlugsJson)
  const claimTypes = parseStringList(request.claimTypesJson)
  const reply = await buildAutomationExplainReply({
    citySlugs,
    claimTypes,
  })
  return {
    createdRunId: null,
    summary: {
      mode: 'EXPLAIN',
      response: reply,
      cityCount: citySlugs.length,
      claimTypeCount: claimTypes.length,
    },
  }
}

async function executeSyncMode(
  request: NonNullable<RunRequestRecord>,
  citySlugs: string[],
  claimTypes: string[],
) {
  const result = await runMetroSyncJob(buildSyncOptions(request, citySlugs, claimTypes))
  return {
    createdRunId: result.runId || null,
    summary: {
      mode: request.mode,
      reportPath: result.reportPath,
      cityCount: result.report.cities.length,
      errorCount: result.report.errors.length,
      telemetry: result.telemetry || null,
    },
  }
}

async function executeFollowUpMode(request: NonNullable<RunRequestRecord>) {
  const baseContext = getBaseContext(request)
  const requestedLimit =
    typeof baseContext.limit === 'number' && Number.isFinite(baseContext.limit)
      ? Math.max(1, Math.floor(baseContext.limit))
      : undefined
  const result = await executePendingResearchRuns({
    citySlugs: parseStringList(request.citySlugsJson),
    claimTypes: parseStringList(request.claimTypesJson),
    limit: requestedLimit,
    autoApplyGreen:
      request.applyPolicy === AutomationApplyPolicy.AUTO_APPLY_GREEN_ONLY,
  })
  return {
    createdRunId: null,
    summary: {
      mode: 'FOLLOW_UP',
      processedCount: result.processedCount,
      runIds: result.runIds,
      limit: requestedLimit || null,
    },
  }
}

async function executeRequestByMode(
  request: NonNullable<RunRequestRecord>,
  citySlugs: string[],
  claimTypes: string[],
) {
  switch (request.mode) {
    case AutomationRunRequestMode.EXPLAIN:
      return executeExplainMode(request)
    case AutomationRunRequestMode.FOLLOW_UP:
      return executeFollowUpMode(request)
    case AutomationRunRequestMode.MANUAL_UPDATE:
    case AutomationRunRequestMode.TARGETED_RESEARCH:
    case AutomationRunRequestMode.SCHEDULED:
    default:
      return executeSyncMode(request, citySlugs, claimTypes)
  }
}

async function main() {
  const requestId = process.argv[2]
  if (!requestId) {
    throw new Error('Missing run request id.')
  }

  const prisma = new PrismaClient()
  try {
    const request = await prisma.automationRunRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) {
      throw new Error('Run request not found.')
    }

    await prisma.automationRunRequest.update({
      where: { id: requestId },
      data: {
        status: AutomationRunRequestStatus.RUNNING,
        startedAt: new Date(),
        errorMessage: null,
      },
    })

    const citySlugs = parseStringList(request.citySlugsJson)
    const claimTypes = parseStringList(request.claimTypesJson)
    const baseContext = getBaseContext(request)
    const execution = await executeRequestByMode(request, citySlugs, claimTypes)

    await prisma.automationRunRequest.update({
      where: { id: requestId },
      data: {
        status: AutomationRunRequestStatus.COMPLETED,
        createdRunId: execution.createdRunId,
        finishedAt: new Date(),
        contextJson: {
          ...baseContext,
          ...execution.summary,
          executor: {
            ...(baseContext.executor && typeof baseContext.executor === 'object'
              ? (baseContext.executor as Record<string, any>)
              : {}),
            status: 'completed',
            mode: request.mode,
            completedAt: new Date().toISOString(),
          },
        },
      },
    })
    if (
      request.mode !== AutomationRunRequestMode.EXPLAIN &&
      ((typeof execution.summary.cityCount === 'number' && execution.summary.cityCount > 0) ||
        (typeof execution.summary.processedCount === 'number' &&
          execution.summary.processedCount > 0))
    ) {
      await recordAutomationAgentOutcome({
        sessionId: request.sessionId || null,
        messageId: request.messageId || null,
        runRequestId: request.id,
        branchId: request.branchId || null,
        outcomeType: AutomationAgentOutcomeType.RUN_REQUEST_USEFUL,
        summaryJson: {
          mode: request.mode,
          ...execution.summary,
        },
      }).catch(() => null)
    }

    console.log(
      JSON.stringify(
        {
          requestId,
          status: 'COMPLETED',
          mode: request.mode,
          createdRunId: execution.createdRunId,
          summary: execution.summary,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    const request = await prisma.automationRunRequest
      .findUnique({
        where: { id: requestId },
        select: { contextJson: true },
      })
      .catch(() => null)
    const baseContext =
      request?.contextJson && typeof request.contextJson === 'object'
        ? (request.contextJson as Record<string, any>)
        : {}
    await prisma.automationRunRequest
      .update({
        where: { id: requestId },
        data: {
          status: AutomationRunRequestStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
          contextJson: {
            ...baseContext,
            executor: {
              ...(baseContext.executor && typeof baseContext.executor === 'object'
                ? (baseContext.executor as Record<string, any>)
                : {}),
              status: 'failed',
              failedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            },
          },
        },
      })
      .catch(() => null)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
