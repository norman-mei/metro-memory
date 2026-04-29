import {
  AutomationEvidenceNodeType,
  AutomationEvidenceEdgeType,
  AutomationResearchRunStatus,
  AutomationResearchTaskStatus,
  AutomationResearchTaskType,
  Prisma,
  PrismaClient,
} from '@prisma/client'

import { buildAutomationClaimResearchState } from '@/lib/automationClaimState'
import { prisma } from '@/lib/prisma'

type DbClient = PrismaClient | Prisma.TransactionClient

function buildPlannerOutput(verificationJson: Record<string, any> | null, title: string) {
  if (!verificationJson) return null

  const followUpRecommended = Boolean(verificationJson.followUpRecommended)
  const recommendedTaskTypes = Array.isArray(verificationJson.recommendedTaskTypes)
    ? verificationJson.recommendedTaskTypes
        .map((value) => String(value))
        .filter((value) => value in AutomationResearchTaskType) as AutomationResearchTaskType[]
    : []

  if (!followUpRecommended || recommendedTaskTypes.length === 0) {
    return null
  }

  const missingEvidence = Array.isArray(verificationJson.missingEvidence)
    ? verificationJson.missingEvidence.map((value) => String(value))
    : []
  const nextBestAction =
    typeof verificationJson.nextBestAction === 'string' ? verificationJson.nextBestAction : null

  return {
    followUpRecommended,
    missingEvidence,
    nextBestAction,
    recommendedTaskTypes,
    tasks: recommendedTaskTypes.map((taskType) => ({
      taskType,
      title: `Research ${taskType.toLowerCase().replaceAll('_', ' ')} for ${title}`,
      expectedArtifactTypes:
        taskType === 'FIND_MAP_PDF'
          ? ['MAP_PDF']
          : taskType === 'FIND_GTFS_FEED'
            ? ['GTFS_FEED']
            : ['OFFICIAL_PAGE', 'PRESS_RELEASE'],
    })),
  }
}

async function ensureClaimNode(
  db: DbClient,
  claimId: string,
  title: string,
  claimType: string,
) {
  const existing = await db.automationEvidenceNode.findFirst({
    where: {
      claimId,
      nodeType: AutomationEvidenceNodeType.CLAIM,
    },
  })

  if (existing) {
    return existing
  }

  return db.automationEvidenceNode.create({
    data: {
      claimId,
      nodeType: AutomationEvidenceNodeType.CLAIM,
      referenceKey: title,
      summaryJson: {
        title,
        claimType,
      },
    },
  })
}

export async function scheduleFollowUpResearchForClaimAdmin(
  claimId: string,
  options: { force?: boolean; db?: DbClient } = {},
) {
  const db = options.db || prisma
  const claim = await db.automationClaim.findUnique({
    where: { id: claimId },
    include: {
      candidate: true,
      verifications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      researchRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!claim || !claim.candidate) {
    throw new Error('Automation claim not found.')
  }

  const latestVerification = claim.verifications[0]
  const verificationJson =
    latestVerification?.verificationJson && typeof latestVerification.verificationJson === 'object'
      ? (latestVerification.verificationJson as Record<string, any>)
      : null
  const plannerOutput = buildPlannerOutput(verificationJson, claim.title)

  if (!plannerOutput) {
    return { claimId, scheduled: false }
  }

  const latestResearchRun = claim.researchRuns[0]
  if (
    !options.force &&
    latestResearchRun &&
    (latestResearchRun.status === AutomationResearchRunStatus.PENDING ||
      latestResearchRun.status === AutomationResearchRunStatus.RUNNING)
  ) {
    return { claimId, scheduled: false }
  }

  const researchRun = await db.automationResearchRun.create({
    data: {
      parentRunId: claim.runId,
      claimId: claim.id,
      citySlug: claim.citySlug,
      status: AutomationResearchRunStatus.PENDING,
      attemptNumber: (latestResearchRun?.attemptNumber || 0) + 1,
      triggerReason:
        plannerOutput.nextBestAction ||
        'Yellow-lane claim requires autonomous follow-up research.',
      nextAttemptAt: new Date(),
      summary: {
        missingEvidence: plannerOutput.missingEvidence,
        nextBestAction: plannerOutput.nextBestAction,
        recommendedTaskTypes: plannerOutput.recommendedTaskTypes,
        forcedByOperator: options.force === true,
      },
    },
  })

  const claimNode = await ensureClaimNode(db, claim.id, claim.title, claim.claimType)
  const createdTasksForState: Array<{
    id: string
    taskType: string
    status: string
    priority: number
    retryCount: number
    nextActionHint: string | null
    nextAttemptAt: Date | null
    goalJson: Record<string, any>
  }> = []
  for (const [index, task] of plannerOutput.tasks.entries()) {
    const createdTask = await db.automationResearchTask.create({
      data: {
        researchRunId: researchRun.id,
        claimId: claim.id,
        citySlug: claim.citySlug,
        taskType: task.taskType,
        status: AutomationResearchTaskStatus.PENDING,
        priority: index,
        retryCount: 0,
        goalJson: {
          taskType: task.taskType,
          title: task.title,
          citySlug: claim.citySlug,
          claimType: claim.claimType,
          candidateTitle: claim.title,
          entityKey: claim.candidate.entityKey,
          queryHint: plannerOutput.nextBestAction || claim.title,
          expectedArtifactTypes: task.expectedArtifactTypes,
          metadata: {
            missingEvidence: plannerOutput.missingEvidence,
            nextBestAction: plannerOutput.nextBestAction,
          },
        },
        nextActionHint: plannerOutput.nextBestAction,
        nextAttemptAt: new Date(),
      },
    })
    createdTasksForState.push({
      id: createdTask.id,
      taskType: createdTask.taskType,
      status: createdTask.status,
      priority: createdTask.priority,
      retryCount: createdTask.retryCount,
      nextActionHint: createdTask.nextActionHint,
      nextAttemptAt: createdTask.nextAttemptAt,
      goalJson: {
        taskType: task.taskType,
        title: task.title,
      },
    })

    const taskNode = await db.automationEvidenceNode.create({
      data: {
        claimId: claim.id,
        researchTaskId: createdTask.id,
        nodeType: AutomationEvidenceNodeType.TASK,
        referenceKey: createdTask.taskType,
        summaryJson: {
          title: task.title,
          priority: index,
          missingEvidence: plannerOutput.missingEvidence,
        },
      },
    })

    await db.automationEvidenceEdge.create({
      data: {
        claimId: claim.id,
        fromNodeId: taskNode.id,
        toNodeId: claimNode.id,
        edgeType: AutomationEvidenceEdgeType.REQUESTED_BY,
        weight: 0.7,
        notesJson: {
          nextBestAction: plannerOutput.nextBestAction,
        },
      },
    })
  }

  const candidateMetadata =
    claim.candidate.metadata && typeof claim.candidate.metadata === 'object'
      ? (claim.candidate.metadata as Record<string, any>)
      : {}
  const claimResearchState = buildAutomationClaimResearchState({
    lane: claim.lane,
    autoApplyEligible: claim.autoApplyEligible,
    verificationJson,
    tasks: createdTasksForState,
    researchRuns: [
      {
        id: researchRun.id,
        status: researchRun.status,
        attemptNumber: researchRun.attemptNumber,
      },
    ],
    latestResearchRunId: researchRun.id,
  })
  await db.automationCandidate.update({
    where: { id: claim.candidate.id },
    data: {
      metadata: {
        ...candidateMetadata,
        followUpStatus: claimResearchState.status,
        latestResearchRunId: researchRun.id,
        claimResearchState,
      },
    },
  })
  await db.automationClaim.update({
    where: { id: claim.id },
    data: {
      verificationNotes: {
        ...(claim.verificationNotes && typeof claim.verificationNotes === 'object'
          ? (claim.verificationNotes as Record<string, any>)
          : {}),
        followUpStatus: claimResearchState.status,
        latestResearchRunId: researchRun.id,
        claimResearchState,
      },
      metadataJson: {
        ...(claim.metadataJson && typeof claim.metadataJson === 'object'
          ? (claim.metadataJson as Record<string, any>)
          : {}),
        followUpStatus: claimResearchState.status,
        latestResearchRunId: researchRun.id,
        claimResearchState,
      },
    },
  })

  return { claimId, scheduled: true, runId: researchRun.id }
}

export async function overrideResearchFollowUpStatusAdmin(input: {
  claimId?: string
  runId?: string
  taskId?: string
  status: 'BLOCKED' | 'EXHAUSTED'
  reason?: string
  db?: DbClient
}) {
  const db = input.db || prisma
  const researchRun =
    input.runId
      ? await db.automationResearchRun.findUnique({
          where: { id: input.runId },
          include: {
            claim: {
              include: {
                candidate: true,
              },
            },
          },
        })
      : input.claimId
        ? await db.automationResearchRun.findFirst({
            where: { claimId: input.claimId },
            orderBy: { createdAt: 'desc' },
            include: {
              claim: {
                include: {
                  candidate: true,
                },
              },
            },
          })
        : null

  if (!researchRun || !researchRun.claim || !researchRun.claim.candidate) {
    throw new Error('Research run not found.')
  }

  if (input.taskId) {
    await db.automationResearchTask.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
        blockedReason: input.reason || `Marked ${input.status.toLowerCase()} by operator.`,
        nextAttemptAt: null,
        lastError: input.reason || null,
      },
    })
  } else {
    await db.automationResearchTask.updateMany({
      where: {
        researchRunId: researchRun.id,
        status: {
          in: [
            AutomationResearchTaskStatus.PENDING,
            AutomationResearchTaskStatus.RUNNING,
            AutomationResearchTaskStatus.FAILED,
          ],
        },
      },
      data: {
        status: input.status,
        blockedReason: input.reason || `Marked ${input.status.toLowerCase()} by operator.`,
        nextAttemptAt: null,
        lastError: input.reason || null,
      },
    })
  }

  const candidateMetadata =
    researchRun.claim.candidate.metadata && typeof researchRun.claim.candidate.metadata === 'object'
      ? (researchRun.claim.candidate.metadata as Record<string, any>)
      : {}
  await db.automationCandidate.update({
    where: { id: researchRun.claim.candidate.id },
    data: {
      metadata: {
        ...candidateMetadata,
        followUpStatus: input.status,
        latestResearchRunId: researchRun.id,
      },
    },
  })

  const verificationNotes =
    researchRun.claim.verificationNotes && typeof researchRun.claim.verificationNotes === 'object'
      ? (researchRun.claim.verificationNotes as Record<string, any>)
      : {}
  const metadataJson =
    researchRun.claim.metadataJson && typeof researchRun.claim.metadataJson === 'object'
      ? (researchRun.claim.metadataJson as Record<string, any>)
      : {}

  await db.automationClaim.update({
    where: { id: researchRun.claim.id },
    data: {
      verificationNotes: {
        ...verificationNotes,
        followUpStatus: input.status,
        latestResearchRunId: researchRun.id,
        operatorReason: input.reason || null,
      },
      metadataJson: {
        ...metadataJson,
        followUpStatus: input.status,
        latestResearchRunId: researchRun.id,
      },
    },
  })

  await db.automationResearchRun.update({
    where: { id: researchRun.id },
    data: {
      status:
        input.status === AutomationResearchTaskStatus.BLOCKED
          ? AutomationResearchRunStatus.BLOCKED
          : AutomationResearchRunStatus.EXHAUSTED,
      nextAttemptAt: null,
      finishedAt: new Date(),
      summary: {
        ...(researchRun.summary && typeof researchRun.summary === 'object'
          ? (researchRun.summary as Record<string, any>)
          : {}),
        operatorReason: input.reason || null,
        operatorOverrideStatus: input.status,
      },
    },
  })

  return {
    runId: researchRun.id,
    claimId: researchRun.claim.id,
    status: input.status,
  }
}
