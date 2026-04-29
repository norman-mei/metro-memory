import {
  AutomationAgentEventType,
  AutomationAgentOutcomeType,
  Prisma,
  PrismaClient,
} from '@prisma/client'

import { autoApplyGreenLaneCandidatesForRun } from '../../src/lib/automationAutopilot.ts'
import {
  loadAutomationAdaptiveResearchContext,
  loadAutomationPolicyMetricContext,
  refreshAutomationAuditMetrics,
} from '../../src/lib/automationAudit.ts'
import { buildAutomationClaimResearchState } from '../../src/lib/automationClaimState.ts'
import { persistSourceCitations } from '../../src/lib/automationProvenance.ts'
import { drainPendingClaimResearchWorkWithExecutor } from '../../src/lib/automationResearchDrain.ts'
import { rememberArtifactSourceForCity } from '../../src/lib/automationResearchMemory.ts'
import {
  recordAutomationAgentEvent,
  recordAutomationAgentOutcome,
} from '../../src/lib/automationRunRequests.ts'
import {
  recordAutomationObservation,
  tryConsumeResearchTaskBudget,
} from '../../src/lib/automationRuntime.ts'

import { collectCityInputs, loadRegistries } from './collect'
import { extractOfficialArtifactFacts } from './officialFacts'
import { buildClaimPolicy } from './policy'
import type {
  CollectedArtifact,
  ExtractedArtifactFact,
  ReviewCandidate,
  ReviewSource,
  ResearchPlannerOutput,
  ResearchTaskRequest,
  ResearchTaskType,
} from './types'
import { buildVerificationScoresWithGrounding } from './verify'

type DbClient = PrismaClient | Prisma.TransactionClient

const MAX_TASK_RETRIES = 2
const RETRY_BACKOFF_MINUTES = [15, 120, 720]

function inferSourceDomain(url?: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function getJsonRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function mapRunStatusFromClaimState(status: ReturnType<typeof buildAutomationClaimResearchState>['status']) {
  if (status === 'SATISFIED') return 'COMPLETED'
  if (status === 'BLOCKED') return 'BLOCKED'
  if (status === 'EXHAUSTED') return 'EXHAUSTED'
  return 'PENDING'
}

function buildTaskRequestFromVerificationJson(input: {
  citySlug: string
  claimType: string
  candidateTitle: string
  entityKey: string | null
  verificationJson: Record<string, any> | null
}): ResearchPlannerOutput | null {
  const verificationJson = input.verificationJson
  if (!verificationJson || typeof verificationJson !== 'object') return null
  const followUpRecommended = Boolean(verificationJson.followUpRecommended)
  const taskTypes = Array.isArray(verificationJson.recommendedTaskTypes)
    ? verificationJson.recommendedTaskTypes
        .map((value) => String(value))
        .filter(Boolean) as ResearchTaskType[]
    : []
  const missingEvidence = Array.isArray(verificationJson.missingEvidence)
    ? verificationJson.missingEvidence.map((value) => String(value))
    : []
  const nextBestAction =
    typeof verificationJson.nextBestAction === 'string' ? verificationJson.nextBestAction : null

  if (!followUpRecommended || taskTypes.length === 0) {
    return null
  }

  const tasks: ResearchTaskRequest[] = taskTypes.map((taskType) => ({
    taskType,
    title: `Research ${String(taskType).toLowerCase().replaceAll('_', ' ')} for ${input.candidateTitle}`,
    citySlug: input.citySlug,
    claimType: input.claimType as ReviewCandidate['type'],
    candidateTitle: input.candidateTitle,
    entityKey: input.entityKey || undefined,
    queryHint:
      typeof verificationJson.nextBestAction === 'string' ? verificationJson.nextBestAction : input.candidateTitle,
    expectedArtifactTypes:
      taskType === 'FIND_MAP_PDF'
        ? ['MAP_PDF']
        : taskType === 'FIND_GTFS_FEED'
          ? ['GTFS_FEED']
          : ['OFFICIAL_PAGE', 'PRESS_RELEASE'],
    metadata: {
      missingEvidence,
      nextBestAction,
    },
  }))

  return {
    followUpRecommended,
    missingEvidence,
    nextBestAction,
    recommendedTaskTypes: taskTypes,
    tasks,
  }
}

function artifactToReviewSource(artifact: CollectedArtifact): ReviewSource {
  return {
    sourceType:
      artifact.artifactType === 'GTFS_FEED'
        ? 'official-gtfs'
        : artifact.artifactType === 'MAP_PDF'
          ? 'official-map-pdf'
          : artifact.artifactType === 'PRESS_RELEASE'
            ? 'official-press-release'
            : artifact.artifactType === 'OFFICIAL_PAGE'
              ? 'official-page'
              : 'search-result',
    label:
      artifact.metadataJson &&
      typeof artifact.metadataJson === 'object' &&
      'title' in artifact.metadataJson &&
      typeof artifact.metadataJson.title === 'string'
        ? artifact.metadataJson.title
        : artifact.sourceDomain || artifact.artifactType,
    url: artifact.sourceUrl,
    snippet:
      artifact.metadataJson &&
      typeof artifact.metadataJson === 'object' &&
      'headline' in artifact.metadataJson &&
      typeof artifact.metadataJson.headline === 'string'
        ? artifact.metadataJson.headline
        : undefined,
    metadata: {
      artifactType: artifact.artifactType,
      sourceDomain: artifact.sourceDomain || null,
      ...(artifact.metadataJson && typeof artifact.metadataJson === 'object'
        ? artifact.metadataJson
        : {}),
    },
  }
}

function factToReviewSource(fact: ExtractedArtifactFact): ReviewSource {
  return {
    sourceType: `official-${String(fact.kind).toLowerCase()}`,
    label: fact.label,
    url: fact.sourceUrl,
    snippet: fact.snippet,
    metadata: {
      extractedFactKind: fact.kind,
      artifactType: fact.artifactType,
      extractedFactConfidence: fact.confidence,
      ...(fact.metadata && typeof fact.metadata === 'object' ? fact.metadata : {}),
    },
  }
}

function buildRetryTime(retryCount: number) {
  const minutes = RETRY_BACKOFF_MINUTES[Math.min(retryCount, RETRY_BACKOFF_MINUTES.length - 1)]
  return new Date(Date.now() + minutes * 60 * 1000)
}

function deriveClaimLineNames(claim: {
  claimType: string
  title: string
  beforeValueJson?: unknown
  afterValueJson?: unknown
  candidate?: {
    entityKey?: string | null
  } | null
}) {
  const values = new Set<string>()
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      values.add(value.trim())
    }
  }
  const addFromObject = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    add((value as Record<string, unknown>).line)
    add((value as Record<string, unknown>).lineId)
    add((value as Record<string, unknown>).lineName)
    add((value as Record<string, unknown>).name)
  }

  addFromObject(claim.beforeValueJson)
  addFromObject(claim.afterValueJson)
  add(claim.candidate?.entityKey?.split('|')[0])
  const titleMatch = claim.title.match(/\bon\s+(.+)$/i)
  if (titleMatch?.[1]) add(titleMatch[1])
  return Array.from(values)
}

async function ensureClaimNode(db: DbClient, claimId: string, title: string, claimType: string) {
  const existing = await db.automationEvidenceNode.findFirst({
    where: {
      claimId,
      nodeType: 'CLAIM',
    },
  })

  if (existing) {
    return existing
  }

  return db.automationEvidenceNode.create({
    data: {
      claimId,
      nodeType: 'CLAIM',
      referenceKey: title,
      summaryJson: {
        title,
        claimType,
      },
    },
  })
}

export async function persistClaimEvidenceGraph(
  db: DbClient,
  input: {
    claimId: string
    claimTitle: string
    claimType: string
    candidate: ReviewCandidate
    artifactIds: string[]
    verificationJson?: Record<string, any> | null
  },
) {
  const claimNode = await ensureClaimNode(db, input.claimId, input.claimTitle, input.claimType)

  for (const artifactId of input.artifactIds) {
    const artifactNode = await db.automationEvidenceNode.create({
      data: {
        claimId: input.claimId,
        nodeType: 'ARTIFACT',
        referenceKey: artifactId,
        summaryJson: {
          artifactId,
        },
      },
    })
    await db.automationEvidenceEdge.create({
      data: {
        claimId: input.claimId,
        fromNodeId: artifactNode.id,
        toNodeId: claimNode.id,
        edgeType: 'SUPPORTS',
        weight: 0.75,
      },
    })
  }

  for (const source of input.candidate.sources) {
    const factKind =
      source.metadata &&
      typeof source.metadata === 'object' &&
      'extractedFactKind' in source.metadata
        ? String(source.metadata.extractedFactKind || '')
        : ''
    if (!factKind) continue

    const factNode = await db.automationEvidenceNode.create({
      data: {
        claimId: input.claimId,
        nodeType: 'FACT',
        referenceKey: `${factKind}:${source.url || source.label || input.claimTitle}`,
        summaryJson: {
          factKind,
          label: source.label || null,
          url: source.url || null,
          snippet: source.snippet || null,
        },
      },
    })
    await db.automationEvidenceEdge.create({
      data: {
        claimId: input.claimId,
        fromNodeId: factNode.id,
        toNodeId: claimNode.id,
        edgeType: factKind === 'CONFLICT_REFERENCE' ? 'CONTRADICTS' : 'SUPPORTS',
        weight: factKind === 'CONFLICT_REFERENCE' ? 0.9 : 0.78,
      },
    })
  }

  if (input.verificationJson?.evidenceGraphSummary) {
    await db.automationEvidenceNode.create({
      data: {
        claimId: input.claimId,
        nodeType: 'FACT',
        referenceKey: `summary:${input.claimId}`,
        summaryJson: input.verificationJson.evidenceGraphSummary,
      },
    })
  }
}

async function scheduleFollowUpResearchForClaimRecord(
  db: DbClient,
  claim: {
    id: string
    runId: string
    citySlug: string
    claimType: string
    title: string
    candidate: {
      id: string
      entityKey: string | null
      metadata: Prisma.JsonValue | null
    } | null
    verifications: Array<{ verificationJson: Prisma.JsonValue | null }>
    researchRuns: Array<{ id: string; status: string; attemptNumber: number }>
  },
  force = false,
) {
  if (!claim.candidate) return false

  const latestVerification = claim.verifications[0]
  const verificationJson =
    latestVerification?.verificationJson && typeof latestVerification.verificationJson === 'object'
      ? (latestVerification.verificationJson as Record<string, any>)
      : null
  const plannerOutput = buildTaskRequestFromVerificationJson({
    citySlug: claim.citySlug,
    claimType: claim.claimType,
    candidateTitle: claim.title,
    entityKey: claim.candidate.entityKey,
    verificationJson,
  })
  if (!plannerOutput?.followUpRecommended || plannerOutput.tasks.length === 0) {
    return false
  }
  const adaptiveResearchContext = await loadAutomationAdaptiveResearchContext(db, {
    cities: [claim.citySlug],
    claimTypes: [claim.claimType],
  })
  const suppressedTaskTypes =
    adaptiveResearchContext.suppressedTaskTypesByClaimType.get(claim.claimType) || []
  const plannedTasks = plannerOutput.tasks.filter(
    (task) => !suppressedTaskTypes.includes(task.taskType),
  )
  if (plannedTasks.length === 0) {
    return false
  }

  const latestResearchRun = claim.researchRuns[0]
  if (
    !force &&
    latestResearchRun &&
    (latestResearchRun.status === 'PENDING' || latestResearchRun.status === 'RUNNING')
  ) {
    return false
  }

  const attemptNumber = force
    ? (latestResearchRun?.attemptNumber || 0) + 1
    : (latestResearchRun?.attemptNumber || 0) + 1
  const researchRun = await db.automationResearchRun.create({
    data: {
      parentRunId: claim.runId,
      claimId: claim.id,
      citySlug: claim.citySlug,
      status: 'PENDING',
      attemptNumber,
      nextAttemptAt: new Date(),
      triggerReason:
        plannerOutput.nextBestAction ||
        'Yellow-lane claim requires autonomous follow-up research.',
      summary: {
        missingEvidence: plannerOutput.missingEvidence,
        nextBestAction: plannerOutput.nextBestAction,
        recommendedTaskTypes: plannedTasks.map((task) => task.taskType),
        suppressedTaskTypes,
        forcedByOperator: force,
      },
    },
  })

  const createdTasksForState: Array<{
    id: string
    taskType: string
    status: string
    priority: number
    retryCount: number
    nextActionHint: string | null
    nextAttemptAt: Date | null
    goalJson: ResearchTaskRequest
  }> = []

  for (const [index, task] of plannedTasks.entries()) {
    const createdTask = await db.automationResearchTask.create({
      data: {
        researchRunId: researchRun.id,
        claimId: claim.id,
        citySlug: claim.citySlug,
        taskType: task.taskType,
        status: 'PENDING',
        priority: index,
        retryCount: 0,
        goalJson: task,
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
      goalJson: task,
    })

    const claimNode = await ensureClaimNode(db, claim.id, claim.title, claim.claimType)
    const taskNode = await db.automationEvidenceNode.create({
      data: {
        claimId: claim.id,
        researchTaskId: createdTask.id,
        nodeType: 'TASK',
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
        edgeType: 'REQUESTED_BY',
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
    lane: 'YELLOW',
    autoApplyEligible: false,
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
    maxResearchRunAttempts: getAutomationRuntimeCaps().maxResearchRunsPerClaim,
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
        ...getJsonRecord(claim.verificationNotes),
        followUpStatus: claimResearchState.status,
        latestResearchRunId: researchRun.id,
        claimResearchState,
      },
      metadataJson: {
        ...getJsonRecord(claim.metadataJson),
        followUpStatus: claimResearchState.status,
        latestResearchRunId: researchRun.id,
        claimResearchState,
      },
    },
  })

  return true
}

export async function scheduleFollowUpResearchForClaim(
  claimId: string,
  options: { force?: boolean; db?: DbClient } = {},
) {
  const db = options.db || new PrismaClient()
  const ownsClient = db instanceof PrismaClient
  try {
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
    if (!claim) {
      throw new Error('Automation claim not found.')
    }
    const scheduled = await scheduleFollowUpResearchForClaimRecord(db, claim, options.force === true)
    return { claimId, scheduled }
  } finally {
    if (ownsClient) {
      await (db as PrismaClient).$disconnect()
    }
  }
}

export async function scheduleFollowUpResearchRunsForRun(
  runId: string,
  db: DbClient = new PrismaClient(),
) {
  const ownsClient = db instanceof PrismaClient
  try {
    const claims = await db.automationClaim.findMany({
      where: {
        runId,
        lane: 'YELLOW',
        candidateId: { not: null },
      },
      include: {
        candidate: {
          include: {
            sources: true,
          },
        },
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

    let scheduledCount = 0
    for (const claim of claims) {
      if (await scheduleFollowUpResearchForClaimRecord(db, claim)) {
        scheduledCount += 1
      }
    }

    return { runId, scheduledCount }
  } finally {
    if (ownsClient) {
      await (db as PrismaClient).$disconnect()
    }
  }
}

export async function executePendingResearchRuns({
  parentRunId,
  citySlugs,
  claimTypes,
  limit = 8,
  autoApplyGreen = process.env.METRO_SYNC_AUTO_APPLY_GREEN === '1',
}: {
  parentRunId?: string
  citySlugs?: string[]
  claimTypes?: string[]
  limit?: number
  autoApplyGreen?: boolean
} = {}) {
  const prisma = new PrismaClient()
  const registriesByCity = new Map(loadRegistries().map((registry) => [registry.city, registry]))
  const now = new Date()

  try {
    const pendingRuns = await prisma.automationResearchRun.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        ...(parentRunId ? { parentRunId } : {}),
        ...(citySlugs && citySlugs.length > 0 ? { citySlug: { in: citySlugs } } : {}),
        ...(claimTypes && claimTypes.length > 0
          ? { claim: { is: { claimType: { in: claimTypes } } } }
          : {}),
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        claim: {
          include: {
            candidate: {
              include: {
                sources: true,
              },
            },
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        tasks: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    let processedCount = 0

    for (const researchRun of pendingRuns) {
      const researchRunStartedAt = Date.now()
      const claim = researchRun.claim
      const candidate = claim?.candidate
      const registry = claim ? registriesByCity.get(claim.citySlug) : null

      if (!claim || !candidate || !registry) {
        await prisma.automationResearchRun.update({
          where: { id: researchRun.id },
          data: {
            status: 'BLOCKED',
            finishedAt: new Date(),
            nextAttemptAt: null,
            errorLog: ['Missing claim, candidate, or registry context for research run.'],
          },
        })
        continue
      }

      await prisma.automationResearchRun.update({
        where: { id: researchRun.id },
        data: {
          status: 'RUNNING',
          startedAt: researchRun.startedAt || new Date(),
        },
      })
      await recordAutomationAgentEvent({
        claimId: claim.id,
        branchId: null,
        createdBy: 'automation-research',
        eventType: AutomationAgentEventType.RESEARCH_STARTED,
        summaryJson: {
          researchRunId: researchRun.id,
          citySlug: claim.citySlug,
          claimType: claim.claimType,
          attemptNumber: researchRun.attemptNumber,
        },
      }).catch(() => null)

      const runnableTasks = researchRun.tasks.filter(
        (task) => task.status === 'PENDING' && (!task.nextAttemptAt || task.nextAttemptAt <= now),
      )
      if (runnableTasks.length === 0) {
        await prisma.automationResearchRun.update({
          where: { id: researchRun.id },
          data: { status: 'PENDING' },
        })
        continue
      }

      const taskRequests = runnableTasks
        .map((task) =>
          task.goalJson && typeof task.goalJson === 'object'
            ? {
                ...(task.goalJson as Record<string, any>),
                taskType: task.taskType,
                title:
                  typeof (task.goalJson as Record<string, any>).title === 'string'
                    ? String((task.goalJson as Record<string, any>).title)
                    : `Research ${task.taskType.toLowerCase().replaceAll('_', ' ')}`,
                citySlug: claim.citySlug,
                candidateTitle: claim.title,
                entityKey: candidate.entityKey || undefined,
              }
            : null,
        ) as ResearchTaskRequest[]
      const collected = await collectCityInputs(registry, {
        researchTasks: taskRequests.filter(Boolean),
        sourceDiscoveryMode: 'official-first',
      })

      const persistedArtifacts: Array<CollectedArtifact & { id: string }> = []
      for (const artifact of collected.artifacts.filter((item) => item.artifactType !== 'OSM_OVERPASS')) {
        const created = await prisma.automationArtifact.create({
          data: {
            runId: researchRun.parentRunId,
            citySlug: artifact.citySlug,
            artifactType: artifact.artifactType,
            sourceUrl: artifact.sourceUrl,
            sourceDomain: artifact.sourceDomain,
            mimeType: artifact.mimeType,
            localPath: artifact.localPath,
            contentHash: artifact.contentHash,
            fetchedAt: artifact.fetchedAt ? new Date(artifact.fetchedAt) : null,
            metadataJson: {
              ...(artifact.metadataJson || {}),
              researchRunId: researchRun.id,
            },
          },
        })
        persistedArtifacts.push({ ...artifact, id: created.id })
        await rememberArtifactSourceForCity(
          {
            citySlug: artifact.citySlug || claim.citySlug,
            domain: artifact.sourceDomain || null,
            sourceUrl: artifact.sourceUrl || null,
            artifactType: artifact.artifactType,
            title:
              artifact.metadataJson &&
              typeof artifact.metadataJson === 'object' &&
              'title' in artifact.metadataJson
                ? String((artifact.metadataJson as Record<string, unknown>).title || '')
                : null,
          },
          prisma,
        ).catch(() => null)
        await prisma.automationClaimArtifact.create({
          data: {
            claimId: claim.id,
            artifactId: created.id,
          },
        }).catch(() => null)
        await prisma.automationSource.create({
          data: {
            candidateId: candidate.id,
            sourceType: artifact.artifactType.toLowerCase(),
            label:
              artifact.metadataJson &&
              typeof artifact.metadataJson === 'object' &&
              'title' in artifact.metadataJson &&
              typeof artifact.metadataJson.title === 'string'
                ? artifact.metadataJson.title
                : artifact.sourceDomain || artifact.artifactType,
            url: artifact.sourceUrl,
            snippet:
              artifact.metadataJson &&
              typeof artifact.metadataJson === 'object' &&
              'headline' in artifact.metadataJson &&
              typeof artifact.metadataJson.headline === 'string'
                ? artifact.metadataJson.headline
                : null,
            metadata: {
              ...(artifact.metadataJson || {}),
              artifactType: artifact.artifactType,
              researchRunId: researchRun.id,
            },
          },
        }).catch(() => null)
      }

      const extractedFacts = await extractOfficialArtifactFacts({
        city: claim.citySlug,
        artifacts: persistedArtifacts,
        lineNames: deriveClaimLineNames({
          claimType: claim.claimType,
          title: claim.title,
          beforeValueJson: claim.beforeValueJson,
          afterValueJson: claim.afterValueJson,
          candidate,
        }),
      })

      const taskNodeIds = new Map<string, string>()
      const taskNodes = await prisma.automationEvidenceNode.findMany({
        where: {
          claimId: claim.id,
          researchTaskId: {
            in: runnableTasks.map((task) => task.id),
          },
        },
      })
      taskNodes.forEach((node) => {
        if (node.researchTaskId) taskNodeIds.set(node.researchTaskId, node.id)
      })
      const claimNode = await ensureClaimNode(prisma, claim.id, claim.title, claim.claimType)
      const taskResultsByType = new Map(
        (collected.researchTaskResults || []).map((result) => [result.taskType, result]),
      )
      const adaptiveResearchContext = await loadAutomationAdaptiveResearchContext(prisma, {
        domains: Array.from(
          new Set(
            (collected.researchTaskResults || [])
              .flatMap((result) => [
                ...(result.failedUrls || [])
                  .map((url) => inferSourceDomain(url))
                  .filter((value): value is string => Boolean(value)),
                ...((result.preferredDomains || []).filter(Boolean) as string[]),
              ])
              .filter(Boolean),
          ),
        ),
        cities: [claim.citySlug],
        claimTypes: [claim.claimType],
      })
      const suppressedTaskTypes =
        adaptiveResearchContext.suppressedTaskTypesByClaimType.get(claim.claimType) || []

      const taskSummaries: Array<{
        taskId: string
        status: string
        artifactCount: number
        retryCount: number
        nextAttemptAt: string | null
      }> = []

      for (const task of runnableTasks) {
        const matchedArtifacts = persistedArtifacts.filter((artifact) => {
          const metadata =
            artifact.metadataJson && typeof artifact.metadataJson === 'object'
              ? artifact.metadataJson
              : {}
          return String(metadata.researchTaskType || '') === task.taskType
        })
        const taskResult = taskResultsByType.get(task.taskType)
        const failedDomains = Array.from(
          new Set(
            (taskResult?.failedUrls || [])
              .map((url) => inferSourceDomain(url))
              .filter((value): value is string => Boolean(value)),
          ),
        )
        const preferredDomains = Array.from(
          new Set((taskResult?.preferredDomains || []).map((value) => value.toLowerCase())),
        )
        const adaptiveRetryBudgets = [...failedDomains, ...preferredDomains].map(
          (domain) => adaptiveResearchContext.domainRetryBudgets.get(domain) ?? MAX_TASK_RETRIES,
        )
        const retryBudget =
          adaptiveRetryBudgets.length > 0
            ? Math.max(0, ...adaptiveRetryBudgets)
            : MAX_TASK_RETRIES
        const suppressedByAnalytics = suppressedTaskTypes.includes(task.taskType)
        const nextRetryCount = task.retryCount + (matchedArtifacts.length > 0 ? 0 : 1)
        const nextAttemptAt =
          matchedArtifacts.length === 0 &&
          taskResult?.retryableFailure &&
          !suppressedByAnalytics &&
          nextRetryCount <= retryBudget
            ? buildRetryTime(nextRetryCount - 1)
            : null
        const taskStatus =
          matchedArtifacts.length > 0
            ? 'SATISFIED'
            : suppressedByAnalytics
              ? 'BLOCKED'
            : taskResult?.retryableFailure && nextRetryCount <= retryBudget
              ? 'PENDING'
              : taskResult?.exhaustedByPolicy || nextRetryCount >= retryBudget
                ? 'EXHAUSTED'
                : 'FAILED'

        await prisma.automationResearchTask.update({
          where: { id: task.id },
          data: {
            status: taskStatus,
            retryCount: nextRetryCount,
            satisfied: matchedArtifacts.length > 0,
            nextAttemptAt,
            lastAttemptAt: new Date(),
            lastError:
              taskResult && taskResult.failedUrls.length > 0
                ? `Failed urls: ${taskResult.failedUrls.join(', ')}`
                : null,
            resultJson: {
              artifactIds: matchedArtifacts.map((artifact) => artifact.id),
              sourceUrls: matchedArtifacts.map((artifact) => artifact.sourceUrl).filter(Boolean),
              artifactCount: matchedArtifacts.length,
              discoveredCount: taskResult?.discoveredCount || 0,
              fetchErrorCount: taskResult?.fetchErrorCount || 0,
              failedUrls: taskResult?.failedUrls || [],
              fetchedUrls: taskResult?.fetchedUrls || [],
            },
            blockedReason:
              taskStatus === 'BLOCKED'
                ? 'Task type suppressed by adaptive analytics because it has been low-yield for this claim type.'
              : taskStatus === 'EXHAUSTED'
                ? 'No qualifying artifacts were discovered within the retry budget.'
                : null,
          },
        })

        taskSummaries.push({
          taskId: task.id,
          status: taskStatus,
          artifactCount: matchedArtifacts.length,
          retryCount: nextRetryCount,
          nextAttemptAt: nextAttemptAt ? nextAttemptAt.toISOString() : null,
        })

        for (const artifact of matchedArtifacts) {
          await prisma.automationResearchTaskArtifact.create({
            data: {
              researchTaskId: task.id,
              artifactId: artifact.id,
            },
          }).catch(() => null)

          const artifactNode = await prisma.automationEvidenceNode.create({
            data: {
              claimId: claim.id,
              nodeType: 'ARTIFACT',
              referenceKey: artifact.id,
              summaryJson: {
                artifactId: artifact.id,
                artifactType: artifact.artifactType,
                sourceUrl: artifact.sourceUrl || null,
                sourceDomain: artifact.sourceDomain || null,
              },
            },
          })
          const taskNodeId = taskNodeIds.get(task.id)
          if (taskNodeId) {
            await prisma.automationEvidenceEdge.create({
              data: {
                claimId: claim.id,
                fromNodeId: taskNodeId,
                toNodeId: artifactNode.id,
                edgeType: 'SATISFIES',
                weight: 0.82,
              },
            })
          }
          await prisma.automationEvidenceEdge.create({
            data: {
              claimId: claim.id,
              fromNodeId: artifactNode.id,
              toNodeId: claimNode.id,
              edgeType: 'SUPPORTS',
              weight: 0.8,
            },
          })
        }
      }

      for (const fact of extractedFacts) {
        const factNode = await prisma.automationEvidenceNode.create({
          data: {
            claimId: claim.id,
            nodeType: 'FACT',
            referenceKey: `${fact.kind}:${fact.sourceUrl || fact.label}`,
            summaryJson: {
              kind: fact.kind,
              label: fact.label,
              sourceUrl: fact.sourceUrl || null,
              sourceDomain: fact.sourceDomain || null,
              metadata: fact.metadata || null,
            },
          },
        })
        await prisma.automationEvidenceEdge.create({
          data: {
            claimId: claim.id,
            fromNodeId: factNode.id,
            toNodeId: claimNode.id,
            edgeType: fact.kind === 'CONFLICT_REFERENCE' ? 'CONTRADICTS' : 'SUPPORTS',
            weight: fact.kind === 'CONFLICT_REFERENCE' ? 0.92 : 0.8,
          },
        })
      }

      const refreshedTasks = await prisma.automationResearchTask.findMany({
        where: { researchRunId: researchRun.id },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      })
      const pendingTasks = refreshedTasks.filter((task) => task.status === 'PENDING')
      const blockedTasks = refreshedTasks.filter((task) => task.status === 'BLOCKED')
      const exhaustedTasks = refreshedTasks.filter((task) => task.status === 'EXHAUSTED')
      const satisfiedTasks = refreshedTasks.filter((task) => task.status === 'SATISFIED')
      const followUpStatus =
        pendingTasks.length > 0
          ? 'PENDING'
          : refreshedTasks.length > 0 && satisfiedTasks.length === refreshedTasks.length
            ? 'SATISFIED'
            : refreshedTasks.length > 0 && blockedTasks.length === refreshedTasks.length
              ? 'BLOCKED'
              : exhaustedTasks.length > 0
                ? 'EXHAUSTED'
                : 'BLOCKED'

      const candidateMetadata =
        candidate.metadata && typeof candidate.metadata === 'object'
          ? (candidate.metadata as Record<string, any>)
          : {}
      const combinedCandidate: ReviewCandidate = {
        citySlug: claim.citySlug,
        type: candidate.type as ReviewCandidate['type'],
        entityKey: candidate.entityKey || undefined,
        title: candidate.title,
        summary: candidate.summary || undefined,
        confidence: candidate.confidence ?? undefined,
        beforeValue: candidate.beforeValue,
        afterValue: candidate.afterValue,
        diff: candidate.diff,
        metadata: {
          ...candidateMetadata,
          followUpStatus,
          latestResearchRunId: researchRun.id,
        },
        sources: [
          ...candidate.sources.map((source) => ({
            sourceType: source.sourceType,
            label: source.label || undefined,
            url: source.url || undefined,
            snippet: source.snippet || undefined,
            metadata:
              source.metadata && typeof source.metadata === 'object'
                ? (source.metadata as Record<string, any>)
                : undefined,
          })),
          ...persistedArtifacts.map(artifactToReviewSource),
          ...extractedFacts.map(factToReviewSource),
        ],
      }

      const verification = await buildVerificationScoresWithGrounding(combinedCandidate)
      const candidateDomains = combinedCandidate.sources
        .map((source) => inferSourceDomain(source.url))
        .filter((value): value is string => Boolean(value))
      const policyMetricContext = await loadAutomationPolicyMetricContext(prisma, {
        domains: candidateDomains,
        cities: [claim.citySlug],
        claimTypes: [claim.claimType],
      })
      const domainTrustScores = candidateDomains
        .map((domain) => policyMetricContext.domainMetrics.get(domain))
        .filter((value): value is { trustScore: number; blocked: boolean } => Boolean(value))
      const policy = buildClaimPolicy(combinedCandidate, verification, {
        domainTrustScore:
          domainTrustScores.length > 0
            ? Math.min(...domainTrustScores.map((metric) => metric.trustScore))
            : undefined,
        domainBlocked: domainTrustScores.some((metric) => metric.blocked),
        cityTrustScore: policyMetricContext.cityMetrics.get(claim.citySlug)?.trustScore,
        claimTypeTrustScore: policyMetricContext.claimTypeMetrics.get(claim.claimType)?.trustScore,
        cityCoolingPenalty: adaptiveResearchContext.cityCoolingPenalties.get(claim.citySlug),
        claimTypeScoreAdjustment:
          adaptiveResearchContext.claimTypeScoreAdjustments.get(claim.claimType),
        forcedLane:
          (policyMetricContext.claimTypeMetrics.get(claim.claimType)?.forcedLane as
            | 'GREEN'
            | 'YELLOW'
            | 'RED'
            | null
            | undefined) || null,
      })

      await prisma.automationVerification.create({
        data: {
          claimId: claim.id,
          ...verification,
        },
      })
      await prisma.automationPolicyDecision.create({
        data: {
          claimId: claim.id,
          ...policy,
        },
      })
      if (claim.lane === 'YELLOW' && policy.lane === 'GREEN') {
        await recordAutomationAgentEvent({
          claimId: claim.id,
          createdBy: 'automation-research',
          eventType: AutomationAgentEventType.CLAIM_IMPROVED,
          summaryJson: {
            researchRunId: researchRun.id,
            citySlug: claim.citySlug,
            claimType: claim.claimType,
            previousLane: claim.lane,
            nextLane: policy.lane,
          },
        }).catch(() => null)
        await recordAutomationAgentOutcome({
          claimId: claim.id,
          outcomeType: AutomationAgentOutcomeType.FOLLOW_UP_IMPROVEMENT,
          summaryJson: {
            citySlug: claim.citySlug,
            claimType: claim.claimType,
            previousLane: claim.lane,
            nextLane: policy.lane,
            researchRunId: researchRun.id,
            taskStatuses: taskSummaries,
          },
        }).catch(() => null)
      }

      const persistedCitationCount = await persistSourceCitations({
        db: prisma,
        claimId: claim.id,
        sources: combinedCandidate.sources,
        artifactIdBySourceUrl: new Map(
          persistedArtifacts
            .filter((artifact) => Boolean(artifact.sourceUrl))
            .map((artifact) => [artifact.sourceUrl!, artifact.id] as const),
        ),
      })

      const latestVerificationJson =
        verification.verificationJson && typeof verification.verificationJson === 'object'
          ? (verification.verificationJson as Record<string, any>)
          : null
      const provisionalClaimResearchState = buildAutomationClaimResearchState({
        lane: policy.lane,
        autoApplyEligible: policy.autoApplyAllowed,
        verificationJson: latestVerificationJson,
        tasks: refreshedTasks,
        researchRuns: [
          {
            id: researchRun.id,
            status: researchRun.status,
            attemptNumber: researchRun.attemptNumber,
          },
        ],
        latestResearchRunId: researchRun.id,
        maxResearchRunAttempts: getAutomationRuntimeCaps().maxResearchRunsPerClaim,
      })
      const replanned = buildTaskRequestFromVerificationJson({
        citySlug: claim.citySlug,
        claimType: claim.claimType,
        candidateTitle: claim.title,
        entityKey: candidate.entityKey || null,
        verificationJson: latestVerificationJson,
      })
      let replannedTaskCount = 0
      if (provisionalClaimResearchState.status === 'PENDING' && replanned?.tasks?.length) {
        const knownTaskTypes = new Set(refreshedTasks.map((task) => task.taskType))
        const claimNodeForReplan = await ensureClaimNode(prisma, claim.id, claim.title, claim.claimType)
        for (const [index, task] of replanned.tasks.entries()) {
          if (knownTaskTypes.has(task.taskType)) continue
          if (suppressedTaskTypes.includes(task.taskType)) continue
          if (
            !tryConsumeResearchTaskBudget(1, {
              citySlug: claim.citySlug,
              claimId: claim.id,
              taskType: task.taskType,
              source: 'replan',
            })
          ) {
            continue
          }
          const createdTask = await prisma.automationResearchTask.create({
            data: {
              researchRunId: researchRun.id,
              claimId: claim.id,
              citySlug: claim.citySlug,
              taskType: task.taskType,
              status: 'PENDING',
              priority: refreshedTasks.length + replannedTaskCount + index,
              retryCount: 0,
              goalJson: task,
              nextActionHint: replanned.nextBestAction,
              nextAttemptAt: new Date(),
            },
          })
          const taskNode = await prisma.automationEvidenceNode.create({
            data: {
              claimId: claim.id,
              researchTaskId: createdTask.id,
              nodeType: 'TASK',
              referenceKey: createdTask.taskType,
              summaryJson: {
                title: task.title,
                priority: createdTask.priority,
                plannerReason: replanned.plannerReason || null,
              },
            },
          })
          await prisma.automationEvidenceEdge.create({
            data: {
              claimId: claim.id,
              fromNodeId: taskNode.id,
              toNodeId: claimNodeForReplan.id,
              edgeType: 'REQUESTED_BY',
              weight: 0.76,
              notesJson: {
                replanned: true,
                nextBestAction: replanned.nextBestAction,
                plannerReason: replanned.plannerReason || null,
              },
            },
          })
          replannedTaskCount += 1
        }
        if (replannedTaskCount < replanned.tasks.length) {
          recordAutomationObservation(
            'warn',
            'replanned_tasks_truncated',
            'Replanned tasks were truncated by the configured task budget.',
            {
              citySlug: claim.citySlug,
              claimId: claim.id,
              requested: replanned.tasks.length,
              created: replannedTaskCount,
            },
          )
        }
      }

      const finalTasks =
        replannedTaskCount > 0
          ? await prisma.automationResearchTask.findMany({
              where: { researchRunId: researchRun.id },
              orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            })
          : refreshedTasks
      const finalRunNextAttemptAt =
        finalTasks
          .filter((task) => task.status === 'PENDING')
          .map((task) => task.nextAttemptAt)
          .filter((value): value is Date => Boolean(value))
          .sort((left, right) => left.getTime() - right.getTime())[0] || null
      const finalClaimResearchState = buildAutomationClaimResearchState({
        lane: policy.lane,
        autoApplyEligible: policy.autoApplyAllowed,
        verificationJson: latestVerificationJson,
        tasks: finalTasks,
        researchRuns: [
          {
            id: researchRun.id,
            status: researchRun.status,
            attemptNumber: researchRun.attemptNumber,
          },
        ],
        latestResearchRunId: researchRun.id,
        maxResearchRunAttempts: getAutomationRuntimeCaps().maxResearchRunsPerClaim,
      })

      await prisma.automationCandidate.update({
        where: { id: candidate.id },
        data: {
          metadata: {
            ...combinedCandidate.metadata,
            followUpStatus: finalClaimResearchState.status,
            latestResearchRunId: researchRun.id,
            claimResearchState: finalClaimResearchState,
          },
        },
      })
      await prisma.automationClaim.update({
        where: { id: claim.id },
        data: {
          lane: policy.lane,
          autoApplyEligible: policy.autoApplyAllowed,
          verificationNotes: {
            ...getJsonRecord(claim.verificationNotes),
            followUpStatus: finalClaimResearchState.status,
            latestResearchRunId: researchRun.id,
            latestResearchTaskSummary: taskSummaries,
            extractedFactCount: extractedFacts.length,
            replannedTaskCount,
            claimResearchState: finalClaimResearchState,
          },
          metadataJson: {
            ...getJsonRecord(claim.metadataJson),
            followUpStatus: finalClaimResearchState.status,
            latestResearchRunId: researchRun.id,
            claimResearchState: finalClaimResearchState,
          },
        },
      })

      if (finalClaimResearchState.status !== 'PENDING') {
        recordAutomationObservation(
          'info',
          'claim_follow_up_finalized',
          finalClaimResearchState.statusReason,
          {
            citySlug: claim.citySlug,
            claimId: claim.id,
            researchRunId: researchRun.id,
            status: finalClaimResearchState.status,
            stopReasons: finalClaimResearchState.stopReasons,
          },
        )
      }

      const runStatus = mapRunStatusFromClaimState(finalClaimResearchState.status)
      await prisma.automationResearchRun.update({
        where: { id: researchRun.id },
        data: {
          status: runStatus,
          nextAttemptAt: runStatus === 'PENDING' ? finalRunNextAttemptAt || new Date() : null,
          finishedAt: runStatus === 'PENDING' ? null : new Date(),
          summary: {
            taskSummaries,
            persistedArtifactCount: persistedArtifacts.length,
            persistedCitationCount,
            extractedFactCount: extractedFacts.length,
            followUpStatus: finalClaimResearchState.status,
            latestLane: policy.lane,
            latestAutoApplyEligible: policy.autoApplyAllowed,
            replannedTaskCount,
            durationMs: Date.now() - researchRunStartedAt,
            claimResearchState: finalClaimResearchState,
            stopReasons: finalClaimResearchState.stopReasons,
            missingEvidence:
              verification.verificationJson &&
              typeof verification.verificationJson === 'object' &&
              'missingEvidence' in verification.verificationJson
                ? verification.verificationJson.missingEvidence
                : [],
            nextBestAction:
              verification.verificationJson &&
              typeof verification.verificationJson === 'object' &&
              'nextBestAction' in verification.verificationJson
                ? verification.verificationJson.nextBestAction
                : null,
          },
        },
      })

      processedCount += 1
    }

    await refreshAutomationAuditMetrics(prisma)

    if (autoApplyGreen) {
      const targetRunIds = Array.from(new Set(pendingRuns.map((run) => run.parentRunId)))
      for (const runId of targetRunIds) {
        await autoApplyGreenLaneCandidatesForRun(
          runId,
          process.env.AUTOMATION_AUTO_APPLY_LABEL || 'automation-policy',
        )
      }
    }

    return {
      processedCount,
      runIds: Array.from(new Set(pendingRuns.map((run) => run.parentRunId))),
    }
  } finally {
    await prisma.$disconnect()
  }
}

export async function drainPendingClaimResearchWork({
  parentRunId,
  citySlugs,
  claimTypes,
  limit = 8,
  maxRounds = 8,
  autoApplyGreen = process.env.METRO_SYNC_AUTO_APPLY_GREEN === '1',
}: {
  parentRunId?: string
  citySlugs?: string[]
  claimTypes?: string[]
  limit?: number
  maxRounds?: number
  autoApplyGreen?: boolean
} = {}) {
  return drainPendingClaimResearchWorkWithExecutor({
    executeRuns: executePendingResearchRuns,
    countRunnableRuns: getRunnablePendingResearchRunCount,
    parentRunId,
    citySlugs,
    claimTypes,
    limit,
    maxRounds,
    autoApplyGreen,
  })
}

export async function getRunnablePendingResearchRunCount({
  parentRunId,
}: {
  parentRunId?: string
} = {}) {
  const prisma = new PrismaClient()
  try {
    return prisma.automationResearchRun.count({
      where: {
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        ...(parentRunId ? { parentRunId } : {}),
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

export async function overrideResearchFollowUpStatus({
  claimId,
  runId,
  taskId,
  status,
  reason,
}: {
  claimId?: string
  runId?: string
  taskId?: string
  status: 'BLOCKED' | 'EXHAUSTED'
  reason?: string
}) {
  const prisma = new PrismaClient()
  try {
    const researchRun =
      runId
        ? await prisma.automationResearchRun.findUnique({
            where: { id: runId },
            include: {
              claim: {
                include: {
                  candidate: true,
                },
              },
            },
          })
        : claimId
          ? await prisma.automationResearchRun.findFirst({
              where: { claimId },
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

    if (taskId) {
      await prisma.automationResearchTask.update({
        where: { id: taskId },
        data: {
          status,
          blockedReason: reason || `Marked ${status.toLowerCase()} by operator.`,
          nextAttemptAt: null,
          lastError: reason || null,
        },
      })
    } else {
      await prisma.automationResearchTask.updateMany({
        where: {
          researchRunId: researchRun.id,
          status: { in: ['PENDING', 'RUNNING', 'FAILED'] },
        },
        data: {
          status,
          blockedReason: reason || `Marked ${status.toLowerCase()} by operator.`,
          nextAttemptAt: null,
          lastError: reason || null,
        },
      })
    }

    const candidateMetadata =
      researchRun.claim.candidate.metadata && typeof researchRun.claim.candidate.metadata === 'object'
        ? (researchRun.claim.candidate.metadata as Record<string, any>)
        : {}
    await prisma.automationCandidate.update({
      where: { id: researchRun.claim.candidate.id },
      data: {
        metadata: {
          ...candidateMetadata,
          followUpStatus: status,
          latestResearchRunId: researchRun.id,
        },
      },
    })
    await prisma.automationClaim.update({
      where: { id: researchRun.claim.id },
      data: {
        verificationNotes: {
          ...(researchRun.claim.verificationNotes && typeof researchRun.claim.verificationNotes === 'object'
            ? (researchRun.claim.verificationNotes as Record<string, any>)
            : {}),
          followUpStatus: status,
          latestResearchRunId: researchRun.id,
          operatorReason: reason || null,
        },
        metadataJson: {
          ...(researchRun.claim.metadataJson && typeof researchRun.claim.metadataJson === 'object'
            ? (researchRun.claim.metadataJson as Record<string, any>)
            : {}),
          followUpStatus: status,
          latestResearchRunId: researchRun.id,
        },
      },
    })
    await prisma.automationResearchRun.update({
      where: { id: researchRun.id },
      data: {
        status,
        nextAttemptAt: null,
        finishedAt: new Date(),
        summary: {
          ...(researchRun.summary && typeof researchRun.summary === 'object'
            ? (researchRun.summary as Record<string, any>)
            : {}),
          operatorReason: reason || null,
          operatorOverrideStatus: status,
        },
      },
    })

    return {
      runId: researchRun.id,
      claimId: researchRun.claim.id,
      status,
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const runArg = process.argv.find((value) => value.startsWith('--run='))
  const limitArg = process.argv.find((value) => value.startsWith('--limit='))
  const runId = runArg ? runArg.slice('--run='.length) : undefined
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined
  const result = await executePendingResearchRuns({
    parentRunId: runId,
    ...(Number.isFinite(limit) && limit ? { limit } : {}),
  })
  console.log(JSON.stringify(result, null, 2))
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
