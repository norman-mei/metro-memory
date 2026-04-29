import {
  AutomationApplyPolicy,
  AutomationAgentActionSafety,
  AutomationAgentActionRequest,
  AutomationAgentActionStatus,
  AutomationAgentEvent,
  AutomationAgentEventType,
  AutomationAgentMessage,
  AutomationAgentMessageRole,
  AutomationAgentMessageStatus,
  AutomationAgentOutcome,
  AutomationAgentOutcomeType,
  AutomationAgentSession,
  AutomationRunRequest,
  AutomationRunRequestMode,
  AutomationRunRequestStatus,
  Prisma,
} from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getAutomationRuntimeCaps, recordQueueDispatch } from '@/lib/automationRuntime'

function resolveGithubRepo() {
  if (process.env.AUTOMATION_GITHUB_REPO?.trim()) {
    return process.env.AUTOMATION_GITHUB_REPO.trim()
  }

  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim()
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim()
  if (owner && slug) {
    return `${owner}/${slug}`
  }

  return null
}

function getRunRequestWorkflowFile() {
  return process.env.AUTOMATION_RUN_REQUEST_WORKFLOW_FILE?.trim() || 'automation-run-request.yml'
}

function getRunRequestWorkflowRef() {
  return (
    process.env.AUTOMATION_WORKFLOW_REF?.trim() ||
    process.env.AUTOMATION_BASE_BRANCH?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    'main'
  )
}

function getRunRequestExecutionMode() {
  const configured = process.env.AUTOMATION_RUN_REQUEST_MODE?.trim()
  if (configured === 'github-actions' || configured === 'local') {
    return configured
  }
  return process.env.VERCEL === '1' ? 'github-actions' : 'local'
}

type AutomationAgentSessionHydrated = AutomationAgentSession & {
  messages: AutomationAgentMessage[]
  runRequests: AutomationRunRequest[]
  outcomes: AutomationAgentOutcome[]
  actionRequests: AutomationAgentActionRequest[]
  events: AutomationAgentEvent[]
}

function limitGroupedRecords<T extends { sessionId: string | null }>(
  items: T[],
  limitPerSession: number,
) {
  const bySessionId = new Map<string, T[]>()
  for (const item of items) {
    if (!item.sessionId) continue
    const current = bySessionId.get(item.sessionId) || []
    if (current.length < limitPerSession) {
      current.push(item)
      bySessionId.set(item.sessionId, current)
    }
  }
  return bySessionId
}

async function loadAutomationAgentMessagesBySessionId(sessionIds: string[], limitPerSession: number) {
  if (sessionIds.length === 0 || limitPerSession <= 0) {
    return new Map<string, AutomationAgentMessage[]>()
  }
  const messages = await prisma.automationAgentMessage.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
  })
  return limitGroupedRecords(messages, limitPerSession)
}

async function loadAutomationRunRequestsBySessionId(sessionIds: string[], limitPerSession: number) {
  if (sessionIds.length === 0 || limitPerSession <= 0) {
    return new Map<string, AutomationRunRequest[]>()
  }
  const runRequests = await prisma.automationRunRequest.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    orderBy: [{ sessionId: 'asc' }, { createdAt: 'desc' }],
  })
  return limitGroupedRecords(runRequests, limitPerSession)
}

async function loadAutomationAgentOutcomesBySessionId(sessionIds: string[], limitPerSession: number) {
  if (sessionIds.length === 0 || limitPerSession <= 0) {
    return new Map<string, AutomationAgentOutcome[]>()
  }

  const outcomes = await prisma.automationAgentOutcome.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    orderBy: [{ sessionId: 'asc' }, { createdAt: 'desc' }],
  })
  return limitGroupedRecords(outcomes, limitPerSession)
}

async function loadAutomationAgentActionRequestsBySessionId(
  sessionIds: string[],
  limitPerSession: number,
) {
  if (sessionIds.length === 0 || limitPerSession <= 0) {
    return new Map<string, AutomationAgentActionRequest[]>()
  }
  const actionRequests = await prisma.automationAgentActionRequest.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    orderBy: [{ sessionId: 'asc' }, { createdAt: 'desc' }],
  })
  return limitGroupedRecords(actionRequests, limitPerSession)
}

async function loadAutomationAgentEventsBySessionId(sessionIds: string[], limitPerSession: number) {
  if (sessionIds.length === 0 || limitPerSession <= 0) {
    return new Map<string, AutomationAgentEvent[]>()
  }
  const events = await prisma.automationAgentEvent.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    orderBy: [{ sessionId: 'asc' }, { createdAt: 'desc' }],
  })
  return limitGroupedRecords(events, limitPerSession)
}

export async function hydrateAutomationAgentSessions(
  sessions: AutomationAgentSession[],
  limits?: {
    messages?: number
    runRequests?: number
    outcomes?: number
    actionRequests?: number
    events?: number
  },
): Promise<AutomationAgentSessionHydrated[]> {
  const sessionIds = sessions.map((session) => session.id)
  const [
    messagesBySessionId,
    runRequestsBySessionId,
    outcomesBySessionId,
    actionRequestsBySessionId,
    eventsBySessionId,
  ] = await Promise.all([
    loadAutomationAgentMessagesBySessionId(sessionIds, limits?.messages ?? 80),
    loadAutomationRunRequestsBySessionId(sessionIds, limits?.runRequests ?? 20),
    loadAutomationAgentOutcomesBySessionId(sessionIds, limits?.outcomes ?? 40),
    loadAutomationAgentActionRequestsBySessionId(sessionIds, limits?.actionRequests ?? 20),
    loadAutomationAgentEventsBySessionId(sessionIds, limits?.events ?? 40),
  ])

  return sessions.map((session) => ({
    ...session,
    messages: messagesBySessionId.get(session.id) || [],
    runRequests: runRequestsBySessionId.get(session.id) || [],
    outcomes: outcomesBySessionId.get(session.id) || [],
    actionRequests: actionRequestsBySessionId.get(session.id) || [],
    events: eventsBySessionId.get(session.id) || [],
  }))
}

export async function hydrateAutomationAgentSessionOutcomes<
  T extends { id: string; outcomes?: never },
>(sessions: T[]): Promise<Array<T & { outcomes: AutomationAgentOutcome[] }>> {
  const outcomesBySessionId = await loadAutomationAgentOutcomesBySessionId(
    sessions.map((session) => session.id),
    40,
  )

  return sessions.map((session) => ({
    ...session,
    outcomes: outcomesBySessionId.get(session.id) || [],
  }))
}

async function dispatchGithubRunRequestWorkflow(requestId: string) {
  const repo = resolveGithubRepo()
  const token =
    process.env.AUTOMATION_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || ''

  if (!repo) {
    throw new Error(
      'Could not resolve the GitHub repository for run-request workflow dispatch. Set AUTOMATION_GITHUB_REPO.',
    )
  }

  if (!token) {
    throw new Error(
      'Missing AUTOMATION_GITHUB_TOKEN for run-request workflow dispatch. Configure a token with Actions write access.',
    )
  }

  const workflowFile = getRunRequestWorkflowFile()
  const ref = getRunRequestWorkflowRef()
  const startedAt = Date.now()

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MetroMemoryAutomation/1.0',
        },
        body: JSON.stringify({
          ref,
          inputs: {
            request_id: requestId,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub run-request workflow dispatch failed: ${errorText}`)
    }

    recordQueueDispatch({
      success: true,
      mode: 'github-actions',
      durationMs: Date.now() - startedAt,
      metadata: {
        requestId,
        repo,
        workflowFile,
      },
    })

    return {
      mode: 'github-actions',
      repo,
      workflowFile,
      ref,
      actionsUrl: `https://github.com/${repo}/actions/workflows/${workflowFile}`,
      dispatchedAt: new Date().toISOString(),
    }
  } catch (error) {
    recordQueueDispatch({
      success: false,
      mode: 'github-actions',
      durationMs: Date.now() - startedAt,
      metadata: {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

async function spawnLocalRunRequestWorker(requestId: string) {
  try {
    const [{ spawn }, pathModule] = await Promise.all([
      import('node:child_process'),
      import('node:path'),
    ])
    const entryScript = pathModule.join(
      process.cwd(),
      'scripts',
      'automation',
      'execute-run-request.ts',
    )
    const runner = pathModule.join(process.cwd(), 'scripts', 'run-ts.js')
    const child = spawn(process.execPath, [runner, entryScript, requestId], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: process.env,
    })
    child.unref()

    recordQueueDispatch({
      success: true,
      mode: 'local',
      metadata: {
        requestId,
        pid: child.pid,
      },
    })

    return {
      mode: 'local',
      pid: child.pid,
      dispatchedAt: new Date().toISOString(),
    }
  } catch (error) {
    recordQueueDispatch({
      success: false,
      mode: 'local',
      metadata: {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

export async function listAutomationAgentSessions(limit = 6) {
  const sessions = await prisma.automationAgentSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
  return hydrateAutomationAgentSessions(sessions, {
    messages: 80,
    runRequests: 20,
    outcomes: 20,
    actionRequests: 20,
    events: 40,
  })
}

export async function createAutomationAgentSession(input: {
  title?: string
  summary?: string
  createdBy?: string
  sessionType?: 'CHAT' | 'TARGETED_RUN' | 'MANUAL_UPDATE'
  contextJson?: Prisma.InputJsonValue
}) {
  const created = await prisma.automationAgentSession.create({
    data: {
      title: input.title,
      summary: input.summary,
      createdBy: input.createdBy,
      ...(input.sessionType ? { sessionType: input.sessionType } : {}),
      ...(input.contextJson ? { contextJson: input.contextJson } : {}),
    },
  })
  const context =
    created.contextJson && typeof created.contextJson === 'object'
      ? (created.contextJson as Record<string, any>)
      : {}
  await prisma.automationAgentSession.update({
    where: { id: created.id },
    data: {
      contextJson: {
        ...context,
        rootSessionId:
          typeof context.rootSessionId === 'string' && context.rootSessionId
            ? context.rootSessionId
            : created.id,
      },
    },
  })
  const hydrated = await getAutomationAgentSessionGraph(created.id)
  if (!hydrated) {
    throw new Error('Failed to hydrate automation agent session.')
  }
  return hydrated
}

export async function appendAutomationAgentMessage(input: {
  sessionId: string
  role: AutomationAgentMessageRole
  content: string
  status?: AutomationAgentMessageStatus
  branchId?: string | null
  branchRootMessageId?: string | null
  parentMessageId?: string | null
  revisionOfMessageId?: string | null
  metadataJson?: Prisma.InputJsonValue
  structuredJson?: Prisma.InputJsonValue
  citationsJson?: Prisma.InputJsonValue
}) {
  const message = await prisma.automationAgentMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      status: input.status || AutomationAgentMessageStatus.COMPLETED,
      content: input.content,
      branchId: input.branchId || null,
      branchRootMessageId: input.branchRootMessageId || null,
      parentMessageId: input.parentMessageId || null,
      revisionOfMessageId: input.revisionOfMessageId || null,
      ...(input.metadataJson ? { metadataJson: input.metadataJson } : {}),
      ...(input.structuredJson ? { structuredJson: input.structuredJson } : {}),
      ...(input.citationsJson ? { citationsJson: input.citationsJson } : {}),
    },
  })

  await prisma.automationAgentSession.update({
    where: { id: input.sessionId },
    data: {
      updatedAt: new Date(),
    },
  })

  return message
}

export async function updateAutomationAgentMessage(input: {
  messageId: string
  content?: string
  status?: AutomationAgentMessageStatus
  metadataJson?: Prisma.InputJsonValue
  structuredJson?: Prisma.InputJsonValue
  citationsJson?: Prisma.InputJsonValue
}) {
  const updated = await prisma.automationAgentMessage.update({
    where: { id: input.messageId },
    data: {
      ...(typeof input.content === 'string' ? { content: input.content } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.metadataJson ? { metadataJson: input.metadataJson } : {}),
      ...(input.structuredJson ? { structuredJson: input.structuredJson } : {}),
      ...(input.citationsJson ? { citationsJson: input.citationsJson } : {}),
    },
  })
  await prisma.automationAgentSession.update({
    where: { id: updated.sessionId },
    data: {
      updatedAt: new Date(),
    },
  })
  return updated
}

export async function getAutomationAgentSessionGraph(sessionId: string) {
  const session = await prisma.automationAgentSession.findUnique({
    where: { id: sessionId },
  })
  if (!session) return null
  const [hydrated] = await hydrateAutomationAgentSessions([session], {
    messages: Number.MAX_SAFE_INTEGER,
    runRequests: Number.MAX_SAFE_INTEGER,
    outcomes: 40,
    actionRequests: 40,
    events: 80,
  })
  return hydrated
}

export async function recordAutomationAgentEvent(input: {
  sessionId?: string | null
  messageId?: string | null
  runRequestId?: string | null
  claimId?: string | null
  branchId?: string | null
  createdBy?: string | null
  eventType: AutomationAgentEventType
  summaryJson?: Prisma.InputJsonValue
}) {
  return prisma.automationAgentEvent.create({
    data: {
      sessionId: input.sessionId || null,
      messageId: input.messageId || null,
      runRequestId: input.runRequestId || null,
      claimId: input.claimId || null,
      branchId: input.branchId || null,
      createdBy: input.createdBy || null,
      eventType: input.eventType,
      summaryJson: input.summaryJson,
    },
  })
}

export async function recordAutomationAgentOutcome(input: {
  sessionId?: string | null
  messageId?: string | null
  runRequestId?: string | null
  claimId?: string | null
  branchId?: string | null
  outcomeType: AutomationAgentOutcomeType
  summaryJson?: Prisma.InputJsonValue
}) {
  return prisma.automationAgentOutcome.create({
    data: {
      sessionId: input.sessionId || null,
      messageId: input.messageId || null,
      runRequestId: input.runRequestId || null,
      claimId: input.claimId || null,
      branchId: input.branchId || null,
      outcomeType: input.outcomeType,
      summaryJson: input.summaryJson,
    },
  })
}

export async function createAutomationAgentActionRequest(input: {
  sessionId?: string | null
  messageId?: string | null
  runRequestId?: string | null
  claimId?: string | null
  branchId?: string | null
  actionType: string
  safety: AutomationAgentActionSafety
  status?: AutomationAgentActionStatus
  payloadJson?: Prisma.InputJsonValue
  rationale?: string | null
  requestedBy?: string | null
  reviewedBy?: string | null
  reviewNote?: string | null
  reviewedAt?: Date | null
  executedAt?: Date | null
  resultJson?: Prisma.InputJsonValue
}) {
  const actionRequest = await prisma.automationAgentActionRequest.create({
    data: {
      sessionId: input.sessionId || null,
      messageId: input.messageId || null,
      runRequestId: input.runRequestId || null,
      claimId: input.claimId || null,
      branchId: input.branchId || null,
      actionType: input.actionType,
      safety: input.safety,
      status: input.status || AutomationAgentActionStatus.PENDING_APPROVAL,
      payloadJson: input.payloadJson,
      rationale: input.rationale || null,
      requestedBy: input.requestedBy || null,
      reviewedBy: input.reviewedBy || null,
      reviewNote: input.reviewNote || null,
      reviewedAt: input.reviewedAt || null,
      executedAt: input.executedAt || null,
      resultJson: input.resultJson,
    },
  })
  await recordAutomationAgentEvent({
    sessionId: input.sessionId || null,
    messageId: input.messageId || null,
    runRequestId: input.runRequestId || null,
    claimId: input.claimId || null,
    branchId: input.branchId || null,
    createdBy: input.requestedBy || null,
    eventType: AutomationAgentEventType.DIRECT_ACTION_REQUESTED,
    summaryJson: {
      actionRequestId: actionRequest.id,
      actionType: input.actionType,
      safety: input.safety,
      status: actionRequest.status,
      rationale: input.rationale || null,
    },
  }).catch(() => null)
  return actionRequest
}

export async function getAutomationAgentActionRequest(actionRequestId: string) {
  return prisma.automationAgentActionRequest.findUnique({
    where: { id: actionRequestId },
  })
}

export async function updateAutomationAgentActionRequest(input: {
  actionRequestId: string
  status?: AutomationAgentActionStatus
  runRequestId?: string | null
  reviewedBy?: string | null
  reviewNote?: string | null
  rationale?: string | null
  reviewedAt?: Date | null
  executedAt?: Date | null
  resultJson?: Prisma.InputJsonValue
}) {
  const updated = await prisma.automationAgentActionRequest.update({
    where: { id: input.actionRequestId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.runRequestId !== 'undefined' ? { runRequestId: input.runRequestId } : {}),
      ...(typeof input.reviewedBy !== 'undefined' ? { reviewedBy: input.reviewedBy } : {}),
      ...(typeof input.reviewNote !== 'undefined' ? { reviewNote: input.reviewNote } : {}),
      ...(typeof input.rationale !== 'undefined' ? { rationale: input.rationale } : {}),
      ...(typeof input.reviewedAt !== 'undefined' ? { reviewedAt: input.reviewedAt } : {}),
      ...(typeof input.executedAt !== 'undefined' ? { executedAt: input.executedAt } : {}),
      ...(typeof input.resultJson !== 'undefined' ? { resultJson: input.resultJson } : {}),
    },
  })

  const eventType =
    updated.status === AutomationAgentActionStatus.APPROVED
      ? AutomationAgentEventType.DIRECT_ACTION_APPROVED
      : updated.status === AutomationAgentActionStatus.REJECTED
        ? AutomationAgentEventType.DIRECT_ACTION_REJECTED
        : updated.status === AutomationAgentActionStatus.EXECUTED
          ? AutomationAgentEventType.DIRECT_ACTION_EXECUTED
          : null
  if (eventType) {
    await recordAutomationAgentEvent({
      sessionId: updated.sessionId || null,
      messageId: updated.messageId || null,
      runRequestId: updated.runRequestId || null,
      claimId: updated.claimId || null,
      branchId: updated.branchId || null,
      createdBy: updated.reviewedBy || updated.requestedBy || null,
      eventType,
      summaryJson: {
        actionRequestId: updated.id,
        actionType: updated.actionType,
        status: updated.status,
        reviewNote: updated.reviewNote || null,
        rationale: updated.rationale || null,
        resultJson: updated.resultJson || null,
      },
    }).catch(() => null)
  }

  return updated
}

export async function getAutomationAgentGraphAnalytics(limit = 10) {
  const sessions = await prisma.automationAgentSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })
  const hydratedSessions = await hydrateAutomationAgentSessions(sessions, {
    messages: Number.MAX_SAFE_INTEGER,
    runRequests: Number.MAX_SAFE_INTEGER,
    outcomes: Number.MAX_SAFE_INTEGER,
    actionRequests: Number.MAX_SAFE_INTEGER,
    events: 0,
  })

  const branchPromptStats = new Map<
    string,
    {
      sessionId: string
      branchId: string
      prompt: string
      usefulOutcomes: number
      stalled: number
      edits: number
      regenerations: number
    }
  >()
  let editBranches = 0
  let editSuccess = 0
  let regenerateBranches = 0
  let regenerateSuccess = 0

  for (const session of hydratedSessions) {
    const branchMessages = new Map<string, typeof session.messages>()
    for (const message of session.messages) {
      const branchId = message.branchId || 'main'
      const messages = branchMessages.get(branchId) || []
      messages.push(message)
      branchMessages.set(branchId, messages)
    }

    for (const [branchId, messages] of branchMessages.entries()) {
      const userPrompt =
        [...messages].reverse().find((message) => message.role === AutomationAgentMessageRole.USER) ||
        messages[0] ||
        null
      const prompt = userPrompt?.content || 'No prompt recorded.'
      const usefulOutcomes = session.outcomes.filter(
        (outcome) =>
          (outcome.branchId || 'main') === branchId &&
          (outcome.outcomeType === AutomationAgentOutcomeType.RUN_REQUEST_USEFUL ||
            outcome.outcomeType === AutomationAgentOutcomeType.FOLLOW_UP_IMPROVEMENT ||
            outcome.outcomeType === AutomationAgentOutcomeType.BRANCH_PROMPT_USEFUL),
      ).length
      const stalled = session.runRequests.filter(
        (request) =>
          (request.branchId || 'main') === branchId &&
          (request.status === AutomationRunRequestStatus.FAILED ||
            request.status === AutomationRunRequestStatus.CANCELED),
      ).length
      const edits = messages.filter(
        (message) => message.role === AutomationAgentMessageRole.USER && Boolean(message.revisionOfMessageId),
      ).length
      const regenerations = messages.filter(
        (message) => message.role === AutomationAgentMessageRole.ASSISTANT && Boolean(message.revisionOfMessageId),
      ).length
      branchPromptStats.set(`${session.id}:${branchId}`, {
        sessionId: session.id,
        branchId,
        prompt,
        usefulOutcomes,
        stalled,
        edits,
        regenerations,
      })

      if (edits > 0) {
        editBranches += 1
        if (usefulOutcomes > 0) editSuccess += 1
      }
      if (regenerations > 0) {
        regenerateBranches += 1
        if (usefulOutcomes > 0) regenerateSuccess += 1
      }
    }
  }

  const stats = Array.from(branchPromptStats.values())
  return {
    bestPerformingBranchPrompts: stats
      .filter((entry) => entry.usefulOutcomes > 0)
      .sort(
        (left, right) =>
          right.usefulOutcomes - left.usefulOutcomes ||
          left.stalled - right.stalled ||
          right.prompt.length - left.prompt.length,
      )
      .slice(0, limit),
    promptsLeadingToUsefulRuns: stats
      .filter((entry) => entry.usefulOutcomes > 0)
      .sort((left, right) => right.usefulOutcomes - left.usefulOutcomes)
      .slice(0, limit),
    repeatedlyStalledBranches: stats
      .filter((entry) => entry.stalled > 0 && entry.usefulOutcomes === 0)
      .sort((left, right) => right.stalled - left.stalled)
      .slice(0, limit),
    reviseVsRegenerate: {
      editBranches,
      editSuccessRate: editBranches > 0 ? Number((editSuccess / editBranches).toFixed(4)) : 0,
      regenerateBranches,
      regenerateSuccessRate:
        regenerateBranches > 0 ? Number((regenerateSuccess / regenerateBranches).toFixed(4)) : 0,
    },
  }
}

export async function createAutomationRunRequest(input: {
  sessionId?: string
  messageId?: string | null
  branchId?: string | null
  requestedBy?: string
  mode: AutomationRunRequestMode
  scope?: string | null
  citySlugs?: string[]
  claimTypes?: string[]
  applyPolicy?: AutomationApplyPolicy
  prompt?: string | null
  contextJson?: Prisma.InputJsonValue
}) {
  const citySlugs = input.citySlugs || []
  const { maxCitiesPerRun } = getAutomationRuntimeCaps()
  if (maxCitiesPerRun && citySlugs.length > maxCitiesPerRun) {
    throw new Error(
      `Run request exceeds METRO_SYNC_MAX_CITIES_PER_RUN=${maxCitiesPerRun}. Narrow the city list before queueing.`,
    )
  }

  return prisma.automationRunRequest.create({
    data: {
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.messageId ? { messageId: input.messageId } : {}),
      ...(input.branchId ? { branchId: input.branchId } : {}),
      requestedBy: input.requestedBy,
      mode: input.mode,
      scope: input.scope || null,
      citySlugsJson: citySlugs,
      claimTypesJson: input.claimTypes || [],
      applyPolicy: input.applyPolicy || AutomationApplyPolicy.REVIEW_ONLY,
      prompt: input.prompt || null,
      ...(input.contextJson ? { contextJson: input.contextJson } : {}),
      status: AutomationRunRequestStatus.DRAFT,
    },
  })
}

export async function queueAutomationRunRequest(requestId: string) {
  const request = await prisma.automationRunRequest.findUnique({
    where: { id: requestId },
  })
  if (!request) {
    throw new Error('Run request not found.')
  }

  const queueBaseContext =
    request.contextJson && typeof request.contextJson === 'object'
      ? (request.contextJson as Record<string, any>)
      : {}

  await prisma.automationRunRequest.update({
    where: { id: requestId },
    data: {
      status: AutomationRunRequestStatus.QUEUED,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      contextJson: {
        ...queueBaseContext,
        executor: {
          status: 'queued',
          requestedAt: new Date().toISOString(),
        },
      },
    },
  })
  await recordAutomationAgentEvent({
    sessionId: request.sessionId || null,
    messageId: request.messageId || null,
    runRequestId: request.id,
    branchId: request.branchId || null,
    createdBy: request.requestedBy || null,
    eventType: AutomationAgentEventType.RUN_REQUEST_QUEUED,
    summaryJson: {
      mode: request.mode,
      citySlugs: request.citySlugsJson || [],
      claimTypes: request.claimTypesJson || [],
    },
  }).catch(() => null)

  try {
    const executor =
      getRunRequestExecutionMode() === 'github-actions'
        ? await dispatchGithubRunRequestWorkflow(requestId)
        : await spawnLocalRunRequestWorker(requestId)

    return prisma.automationRunRequest.update({
      where: { id: requestId },
      data: {
        contextJson: {
          ...queueBaseContext,
          executor: {
            ...executor,
            status: 'queued',
          },
        },
      },
    })
  } catch (error) {
    await prisma.automationRunRequest.update({
      where: { id: requestId },
      data: {
        status: AutomationRunRequestStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        contextJson: {
          ...queueBaseContext,
          executor: {
            mode: getRunRequestExecutionMode(),
            status: 'failed',
            failedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
        },
      },
    })
    throw error
  }
}
