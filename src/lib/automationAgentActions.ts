import {
  AutomationAgentActionSafety,
  AutomationAgentActionStatus,
  AutomationAgentEventType,
  AutomationAgentOutcomeType,
  AutomationApplyPolicy,
  AutomationResearchMemoryKind,
  AutomationRunRequestMode,
} from '@prisma/client'

import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import {
  detectCities,
  detectClaimTypes,
  normalizeText,
  parseCsvField,
  parseStructuredField,
} from '@/lib/automationAgentModel'
import { refreshAutomationAuditMetrics, updateAutomationDomainOverride } from '@/lib/automationAudit'
import {
  createAutomationAgentActionRequest,
  createAutomationRunRequest,
  getAutomationAgentActionRequest,
  queueAutomationRunRequest,
  recordAutomationAgentEvent,
  recordAutomationAgentOutcome,
  updateAutomationAgentActionRequest,
} from '@/lib/automationRunRequests'
import { rememberAutomationResearchMemory } from '@/lib/automationResearchMemory'
import { buildAutomationExplainReply } from '@/lib/automationExplain'
import { overrideResearchFollowUpStatusAdmin, scheduleFollowUpResearchForClaimAdmin } from '@/lib/automationResearchAdmin'
import { prisma } from '@/lib/prisma'

type DirectActionType =
  | 'RERUN_FOLLOW_UP'
  | 'BLOCK_DOMAIN'
  | 'MARK_CLAIM_EXHAUSTED'
  | 'OPEN_EVIDENCE'
  | 'QUEUE_FOLLOW_UP'
  | 'APPROVE_ACTION_REQUEST'
  | 'REJECT_ACTION_REQUEST'

export type ParsedDirectAutomationAction = {
  type: DirectActionType
  claimId?: string
  domain?: string
  citySlugs?: string[]
  claimTypes?: string[]
  actionRequestId?: string
  rationale?: string | null
  assistantMessage: string
}

type DirectActionExecutionResult = {
  assistantMessage: string
  actionRequestId?: string | null
}

function parseClaimId(message: string) {
  const structured =
    parseStructuredField(message, ['Claim ID', 'Claim']) ||
    ''
  const structuredValue = structured.split(/\s+/)[0]?.trim()
  if (structuredValue && structuredValue.length >= 10) return structuredValue
  const match = message.match(/\bclaim(?:\s+id)?\s*[:#]?\s*([a-z0-9]{10,40})\b/i)
  return match?.[1] || null
}

function parseDomain(message: string) {
  const structured = parseStructuredField(message, ['Domain', 'Host'])
  const raw = structured || message.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i)?.[0] || ''
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase() || null
}

function parseActionRequestId(message: string) {
  const structured =
    parseStructuredField(message, ['Action request', 'Action ID', 'Request ID']) || ''
  const structuredValue = structured.split(/\s+/)[0]?.trim()
  if (structuredValue && structuredValue.length >= 10) return structuredValue
  const match = message.match(/\baction(?:\s+request)?\s*(?:id)?\s*[:#]?\s*([a-z0-9]{10,40})\b/i)
  return match?.[1] || null
}

function parseRationale(message: string) {
  const structured = parseStructuredField(message, ['Reason', 'Rationale', 'Because'])
  if (structured) return structured
  const inline =
    message.match(/\bbecause\s+(.+)$/i)?.[1] ||
    message.match(/\breason\s*:\s*(.+)$/i)?.[1] ||
    null
  return inline?.trim() || null
}

function getDirectActionSafety(actionType: Exclude<DirectActionType, 'APPROVE_ACTION_REQUEST' | 'REJECT_ACTION_REQUEST'>) {
  if (actionType === 'OPEN_EVIDENCE' || actionType === 'QUEUE_FOLLOW_UP' || actionType === 'RERUN_FOLLOW_UP') {
    return AutomationAgentActionSafety.SAFE
  }
  if (actionType === 'MARK_CLAIM_EXHAUSTED') {
    return AutomationAgentActionSafety.CONFIRMATION_REQUIRED
  }
  return AutomationAgentActionSafety.ADMIN_RATIONALE_REQUIRED
}

export function parseDirectAutomationAction(message: string): ParsedDirectAutomationAction | null {
  const lower = normalizeText(message)
  const claimId = parseClaimId(message)
  const domain = parseDomain(message)
  const actionRequestId = parseActionRequestId(message)
  const rationale = parseRationale(message)
  const availableCitySlugs = Array.from(AVAILABLE_CITY_SLUGS)
  const structuredCities = parseCsvField(parseStructuredField(message, ['Cities', 'City slugs']))
  const structuredClaimTypes = parseCsvField(parseStructuredField(message, ['Claim types', 'Claims']))
  const citySlugs = (structuredCities.length > 0 ? structuredCities : detectCities(message, availableCitySlugs))
    .filter((value) => AVAILABLE_CITY_SLUGS.has(value))
  const claimTypes =
    structuredClaimTypes.length > 0 ? structuredClaimTypes : detectClaimTypes(message)

  if ((lower.includes('approve') || lower.includes('confirm')) && actionRequestId) {
    return {
      type: 'APPROVE_ACTION_REQUEST',
      actionRequestId,
      rationale,
      assistantMessage: `I can approve action request ${actionRequestId}.`,
    }
  }

  if ((lower.includes('reject') || lower.includes('cancel')) && actionRequestId) {
    return {
      type: 'REJECT_ACTION_REQUEST',
      actionRequestId,
      rationale,
      assistantMessage: `I can reject action request ${actionRequestId}.`,
    }
  }

  if ((lower.includes('rerun') || lower.includes('re run')) && lower.includes('follow up') && claimId) {
    return {
      type: 'RERUN_FOLLOW_UP',
      claimId,
      rationale,
      assistantMessage: `I can rerun autonomous follow-up research for claim ${claimId}.`,
    }
  }

  if ((lower.includes('block') || lower.includes('ban')) && lower.includes('domain') && domain) {
    return {
      type: 'BLOCK_DOMAIN',
      domain,
      rationale,
      assistantMessage: `I can block ${domain} from automation planning and scoring.`,
    }
  }

  if (lower.includes('exhaust') && claimId) {
    return {
      type: 'MARK_CLAIM_EXHAUSTED',
      claimId,
      rationale,
      assistantMessage: `I can mark claim ${claimId} as exhausted.`,
    }
  }

  if ((lower.includes('evidence') || lower.includes('provenance')) && claimId) {
    return {
      type: 'OPEN_EVIDENCE',
      claimId,
      rationale,
      assistantMessage: `I can open the evidence trail for claim ${claimId}.`,
    }
  }

  if (lower.includes('follow up') && (lower.includes('queue') || lower.includes('run') || lower.includes('drain'))) {
    if (citySlugs.length === 0 && claimTypes.length === 0) {
      return null
    }
    return {
      type: 'QUEUE_FOLLOW_UP',
      citySlugs,
      claimTypes,
      rationale,
      assistantMessage: `I can queue a follow-up-only run for ${citySlugs.join(', ') || claimTypes.join(', ')}.`,
    }
  }

  return null
}

export async function buildClaimEvidenceTrail(claimId: string) {
  const claim = await prisma.automationClaim.findUnique({
    where: { id: claimId },
    include: {
      verifications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      policyDecisions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      citations: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          artifact: true,
          researchTask: true,
        },
      },
      artifactLinks: {
        include: {
          artifact: true,
        },
      },
      researchRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          tasks: {
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            take: 6,
          },
        },
      },
    },
  })

  if (!claim) {
    throw new Error('Claim not found.')
  }

  const latestVerification =
    claim.verifications[0]?.verificationJson && typeof claim.verifications[0].verificationJson === 'object'
      ? (claim.verifications[0].verificationJson as Record<string, any>)
      : {}
  const latestResearchRun = claim.researchRuns[0]
  const lines = [
    `${claim.title} (${claim.claimType})`,
    `Lane: ${claim.lane}`,
    `Policy: ${claim.policyDecisions[0]?.decisionReason || claim.reason || 'No policy reason recorded.'}`,
    `Missing evidence: ${Array.isArray(latestVerification.missingEvidence) && latestVerification.missingEvidence.length > 0 ? latestVerification.missingEvidence.join('; ') : 'none recorded'}`,
    `Next action: ${typeof latestVerification.nextBestAction === 'string' ? latestVerification.nextBestAction : 'none recorded'}`,
  ]

  if (latestResearchRun) {
    lines.push(
      `Research run: ${latestResearchRun.status.toLowerCase()} attempt ${latestResearchRun.attemptNumber}`,
    )
    if (latestResearchRun.tasks.length > 0) {
      lines.push(
        `Tasks: ${latestResearchRun.tasks.map((task) => `${task.taskType}:${task.status}`).join(' | ')}`,
      )
    }
  }

  if (claim.citations.length > 0) {
    lines.push(
      `Citations: ${claim.citations
        .map((citation) => {
          const locator =
            citation.locatorType === 'PDF_PAGE' && typeof citation.pageNumber === 'number'
              ? `page ${citation.pageNumber}`
              : citation.locatorType === 'HTML_SELECTOR' && citation.domSelector
                ? citation.domSelector
                : citation.locatorType.toLowerCase().replaceAll('_', ' ')
          return `${locator}: "${citation.excerpt.replace(/\s+/g, ' ').trim().slice(0, 160)}"${citation.sourceUrl ? ` (${citation.sourceUrl})` : ''}`
        })
        .join(' || ')}`,
    )
  }

  if (claim.artifactLinks.length > 0) {
    lines.push(
      `Artifacts: ${claim.artifactLinks
        .slice(0, 6)
        .map((link) => `${link.artifact.artifactType}:${link.artifact.sourceUrl || link.artifact.localPath || link.artifact.id}`)
        .join(' | ')}`,
    )
  }

  return lines.join('\n')
}

export async function executeDirectAutomationAction(input: {
  action: ParsedDirectAutomationAction
  sessionId: string
  messageId: string
  branchId?: string | null
  reviewer?: string | null
  rawMessage?: string
}): Promise<DirectActionExecutionResult> {
  if (input.action.type === 'APPROVE_ACTION_REQUEST') {
    const actionRequest = await getAutomationAgentActionRequest(input.action.actionRequestId!)
    if (!actionRequest) {
      throw new Error('Action request not found.')
    }
    if (actionRequest.status !== AutomationAgentActionStatus.PENDING_APPROVAL) {
      return {
        assistantMessage: `Action request ${actionRequest.id} is already ${actionRequest.status.toLowerCase().replaceAll('_', ' ')}.`,
        actionRequestId: actionRequest.id,
      }
    }
    const currentRationale =
      input.action.rationale || actionRequest.rationale || actionRequest.reviewNote || null
    if (
      actionRequest.safety === AutomationAgentActionSafety.ADMIN_RATIONALE_REQUIRED &&
      !currentRationale
    ) {
      return {
        assistantMessage: `Action request ${actionRequest.id} still needs a rationale. Reply with "approve action ${actionRequest.id} reason: ...".`,
        actionRequestId: actionRequest.id,
      }
    }

    const approved = await updateAutomationAgentActionRequest({
      actionRequestId: actionRequest.id,
      status: AutomationAgentActionStatus.APPROVED,
      reviewedBy: input.reviewer || 'operator-agent',
      reviewNote: currentRationale,
      rationale: currentRationale,
      reviewedAt: new Date(),
    })
    const parsedAction =
      approved.payloadJson && typeof approved.payloadJson === 'object'
        ? ((approved.payloadJson as Record<string, unknown>).action as ParsedDirectAutomationAction | undefined)
        : undefined
    if (!parsedAction) {
      throw new Error('Approved action request is missing executable payload.')
    }
    const performed = await performDirectAutomationAction({
      action: parsedAction,
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || actionRequest.branchId || null,
      reviewer: input.reviewer || null,
      rawMessage: input.rawMessage,
      rationale: currentRationale,
    })
    await updateAutomationAgentActionRequest({
      actionRequestId: actionRequest.id,
      status: AutomationAgentActionStatus.EXECUTED,
      runRequestId: performed.runRequestId || null,
      reviewedBy: input.reviewer || 'operator-agent',
      reviewNote: currentRationale,
      rationale: currentRationale,
      reviewedAt: new Date(),
      executedAt: new Date(),
      resultJson: {
        assistantMessage: performed.message,
        runRequestId: performed.runRequestId || null,
      },
    })
    return {
      assistantMessage: performed.message,
      actionRequestId: actionRequest.id,
    }
  }

  if (input.action.type === 'REJECT_ACTION_REQUEST') {
    const actionRequest = await getAutomationAgentActionRequest(input.action.actionRequestId!)
    if (!actionRequest) {
      throw new Error('Action request not found.')
    }
    const rejected = await updateAutomationAgentActionRequest({
      actionRequestId: actionRequest.id,
      status: AutomationAgentActionStatus.REJECTED,
      reviewedBy: input.reviewer || 'operator-agent',
      reviewNote: input.action.rationale || input.rawMessage || 'Rejected in agent chat.',
      rationale: input.action.rationale || null,
      reviewedAt: new Date(),
    })
    return {
      assistantMessage: `Rejected action request ${rejected.id}.`,
      actionRequestId: rejected.id,
    }
  }

  const safety = getDirectActionSafety(input.action.type)
  const needsConfirmation = safety === AutomationAgentActionSafety.CONFIRMATION_REQUIRED
  const needsRationale =
    safety === AutomationAgentActionSafety.ADMIN_RATIONALE_REQUIRED && !input.action.rationale

  if (needsConfirmation || needsRationale) {
    const actionRequest = await createAutomationAgentActionRequest({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      claimId: input.action.claimId || null,
      actionType: input.action.type,
      safety,
      status: AutomationAgentActionStatus.PENDING_APPROVAL,
      payloadJson: {
        action: input.action,
      },
      rationale: input.action.rationale || null,
      requestedBy: input.reviewer || 'operator-agent',
      reviewNote: needsConfirmation
        ? 'Confirmation required before execution.'
        : 'Rationale required before execution.',
    })
    return {
      assistantMessage: needsConfirmation
        ? `Action request ${actionRequest.id} is pending confirmation. Reply "approve action ${actionRequest.id}" to execute it.`
        : `Action request ${actionRequest.id} needs a rationale. Reply "approve action ${actionRequest.id} reason: ..." to execute it.`,
      actionRequestId: actionRequest.id,
    }
  }

  const actionRequest = await createAutomationAgentActionRequest({
    sessionId: input.sessionId,
    messageId: input.messageId,
    branchId: input.branchId || null,
    claimId: input.action.claimId || null,
    actionType: input.action.type,
    safety,
    status: AutomationAgentActionStatus.APPROVED,
    payloadJson: {
      action: input.action,
    },
    rationale: input.action.rationale || null,
    requestedBy: input.reviewer || 'operator-agent',
    reviewedBy: input.reviewer || 'operator-agent',
    reviewNote: input.action.rationale || input.rawMessage || null,
    reviewedAt: new Date(),
  })
  const performed = await performDirectAutomationAction({
    action: input.action,
    sessionId: input.sessionId,
    messageId: input.messageId,
    branchId: input.branchId || null,
    reviewer: input.reviewer || null,
    rawMessage: input.rawMessage,
    rationale: input.action.rationale || null,
  })
  await updateAutomationAgentActionRequest({
    actionRequestId: actionRequest.id,
    status: AutomationAgentActionStatus.EXECUTED,
    runRequestId: performed.runRequestId || null,
    reviewedBy: input.reviewer || 'operator-agent',
    reviewNote: input.action.rationale || input.rawMessage || null,
    rationale: input.action.rationale || null,
    reviewedAt: new Date(),
    executedAt: new Date(),
    resultJson: {
      assistantMessage: performed.message,
      runRequestId: performed.runRequestId || null,
    },
  })
  return {
    assistantMessage: performed.message,
    actionRequestId: actionRequest.id,
  }
}

async function performDirectAutomationAction(input: {
  action: ParsedDirectAutomationAction
  sessionId: string
  messageId: string
  branchId?: string | null
  reviewer?: string | null
  rawMessage?: string
  rationale?: string | null
}) {
  if (input.action.type === 'RERUN_FOLLOW_UP') {
    const result = await scheduleFollowUpResearchForClaimAdmin(input.action.claimId!, { force: true })
    await refreshAutomationAuditMetrics()
    await recordAutomationAgentOutcome({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      claimId: input.action.claimId || null,
      outcomeType: AutomationAgentOutcomeType.DIRECT_ACTION,
      summaryJson: {
        action: input.action.type,
        result,
      },
    })
    return {
      message: `Queued autonomous follow-up rerun for claim ${input.action.claimId}.`,
      runRequestId: null,
    }
  }

  if (input.action.type === 'BLOCK_DOMAIN') {
    await updateAutomationDomainOverride({
      domain: input.action.domain!,
      manualBlocked: true,
      overrideReason: input.rationale || input.rawMessage || 'Blocked by operator through agent chat.',
    })
    await rememberAutomationResearchMemory({
      kind: AutomationResearchMemoryKind.DOMAIN_RECIPE,
      key: `blocked:${input.action.domain}`,
      domain: input.action.domain,
      valueJson: {
        blocked: true,
        blockedBy: input.reviewer || 'operator-agent',
        reason: input.rawMessage || null,
      },
      trustScore: 1,
    })
    await refreshAutomationAuditMetrics()
    await recordAutomationAgentEvent({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      createdBy: input.reviewer || 'operator-agent',
      eventType: AutomationAgentEventType.DOMAIN_BLOCKED,
      summaryJson: {
        domain: input.action.domain,
        rationale: input.rationale || input.rawMessage || null,
      },
    }).catch(() => null)
    await recordAutomationAgentOutcome({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      outcomeType: AutomationAgentOutcomeType.PLANNER_DEFAULT,
      summaryJson: {
        action: input.action.type,
        domain: input.action.domain,
      },
    })
    return {
      message: `Blocked domain ${input.action.domain} and stored it as a planner default.`,
      runRequestId: null,
    }
  }

  if (input.action.type === 'MARK_CLAIM_EXHAUSTED') {
    const result = await overrideResearchFollowUpStatusAdmin({
      claimId: input.action.claimId!,
      status: 'EXHAUSTED',
      reason: input.rationale || input.rawMessage || 'Marked exhausted by operator through agent chat.',
    })
    await refreshAutomationAuditMetrics()
    await recordAutomationAgentOutcome({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      claimId: input.action.claimId || null,
      outcomeType: AutomationAgentOutcomeType.DIRECT_ACTION,
      summaryJson: {
        action: input.action.type,
        result,
      },
    })
    return {
      message: `Marked claim ${input.action.claimId} as exhausted.`,
      runRequestId: null,
    }
  }

  if (input.action.type === 'OPEN_EVIDENCE') {
    const evidenceTrail = await buildClaimEvidenceTrail(input.action.claimId!)
    await recordAutomationAgentOutcome({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      claimId: input.action.claimId || null,
      outcomeType: AutomationAgentOutcomeType.EXPLAIN_ACTION,
      summaryJson: {
        action: input.action.type,
      },
    })
    return {
      message: evidenceTrail,
      runRequestId: null,
    }
  }

  if (input.action.type === 'QUEUE_FOLLOW_UP') {
    const request = await createAutomationRunRequest({
      sessionId: input.sessionId,
      messageId: input.messageId,
      branchId: input.branchId || null,
      requestedBy: input.reviewer || undefined,
      mode: AutomationRunRequestMode.FOLLOW_UP,
      citySlugs: input.action.citySlugs || [],
      claimTypes: input.action.claimTypes || [],
      applyPolicy: AutomationApplyPolicy.REVIEW_ONLY,
      prompt: input.rawMessage || null,
      contextJson: {
        directAction: input.action,
        mode: 'FOLLOW_UP',
      },
    })
    await queueAutomationRunRequest(request.id)
    await recordAutomationAgentOutcome({
      sessionId: input.sessionId,
      messageId: input.messageId,
      runRequestId: request.id,
      branchId: input.branchId || null,
      outcomeType: AutomationAgentOutcomeType.DIRECT_ACTION,
      summaryJson: {
        action: input.action.type,
        citySlugs: input.action.citySlugs || [],
        claimTypes: input.action.claimTypes || [],
      },
    })
    return {
      message: `Queued follow-up-only run request ${request.id} for ${[
        ...(input.action.citySlugs || []),
        ...(input.action.claimTypes || []),
      ].join(', ')}.`,
      runRequestId: request.id,
    }
  }

  return {
    message: await buildAutomationExplainReply({
      citySlugs: [],
    }),
    runRequestId: null,
  }
}
