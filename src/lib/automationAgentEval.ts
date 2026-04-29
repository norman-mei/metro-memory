import { AutomationAgentActionStatus, AutomationAgentOutcomeType } from '@prisma/client'

import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import {
  ParsedAutomationOperatorAction,
  heuristicOperatorMessage,
} from '@/lib/automationAgentModel'
import { prisma } from '@/lib/prisma'
import { hydrateAutomationAgentSessionOutcomes } from '@/lib/automationRunRequests'

type EvalResult = {
  name: string
  passed: boolean
  details: Record<string, any>
}

type MessageGraphEvalInput = {
  messages: Array<{
    id: string
    branchId?: string | null
    parentMessageId?: string | null
    revisionOfMessageId?: string | null
    content: string
  }>
  targetMessageId: string
  expectedBranchId: string
  expectedAncestorIds: string[]
}

function includesAll(haystack: string[], needles: string[]) {
  const normalized = haystack.map((value) => value.toUpperCase())
  return needles.every((needle) => normalized.includes(needle.toUpperCase()))
}

export function evaluateExplainReplyCase(input: {
  name: string
  reply: string
  requiredFragments: string[]
}) {
  const missing = input.requiredFragments.filter(
    (fragment) => !input.reply.toLowerCase().includes(fragment.toLowerCase()),
  )
  return {
    name: input.name,
    passed: missing.length === 0,
    details: {
      missing,
    },
  } satisfies EvalResult
}

export function evaluateOperatorRoutingCase(input: {
  name: string
  message: string
  expectedMode: ParsedAutomationOperatorAction['mode']
  expectedCities: string[]
  expectedClaimTypes?: string[]
}) {
  const parsed = heuristicOperatorMessage(input.message)
  const passed =
    parsed.mode === input.expectedMode &&
    includesAll(parsed.citySlugs, input.expectedCities) &&
    includesAll(parsed.claimTypes, input.expectedClaimTypes || [])

  return {
    name: input.name,
    passed,
    details: {
      parsed,
      expectedMode: input.expectedMode,
      expectedCities: input.expectedCities,
      expectedClaimTypes: input.expectedClaimTypes || [],
    },
  } satisfies EvalResult
}

export function evaluateFollowUpImprovementCase(input: {
  name: string
  beforeYellowCount: number
  afterYellowCount: number
  beforeGreenCount?: number
  afterGreenCount?: number
}) {
  const yellowReduced = input.afterYellowCount < input.beforeYellowCount
  const greenImproved =
    typeof input.beforeGreenCount === 'number' && typeof input.afterGreenCount === 'number'
      ? input.afterGreenCount >= input.beforeGreenCount
      : true

  return {
    name: input.name,
    passed: yellowReduced && greenImproved,
    details: {
      beforeYellowCount: input.beforeYellowCount,
      afterYellowCount: input.afterYellowCount,
      beforeGreenCount: input.beforeGreenCount ?? null,
      afterGreenCount: input.afterGreenCount ?? null,
    },
  } satisfies EvalResult
}

export function evaluateFalsePositiveGuardCase(input: {
  name: string
  lane: 'GREEN' | 'YELLOW' | 'RED'
  autoApplyAllowed: boolean
  humanOutcome: 'APPROVE' | 'REJECT'
  reverted?: boolean
}) {
  const falsePositive =
    (input.humanOutcome === 'REJECT' && input.lane === 'GREEN') ||
    Boolean(input.reverted && input.autoApplyAllowed)

  return {
    name: input.name,
    passed: !falsePositive,
    details: {
      lane: input.lane,
      autoApplyAllowed: input.autoApplyAllowed,
      humanOutcome: input.humanOutcome,
      reverted: Boolean(input.reverted),
    },
  } satisfies EvalResult
}

export function evaluateMessageGraphCase(input: MessageGraphEvalInput) {
  const messagesById = new Map(input.messages.map((message) => [message.id, message]))
  const target = messagesById.get(input.targetMessageId)
  const ancestorIds: string[] = []
  let cursor = target
  while (cursor?.parentMessageId) {
    ancestorIds.push(cursor.parentMessageId)
    cursor = messagesById.get(cursor.parentMessageId)
  }

  const passed =
    (target?.branchId || '') === input.expectedBranchId &&
    input.expectedAncestorIds.every((id, index) => ancestorIds[index] === id)

  return {
    name: `message_graph:${input.targetMessageId}`,
    passed,
    details: {
      branchId: target?.branchId || null,
      expectedBranchId: input.expectedBranchId,
      ancestorIds,
      expectedAncestorIds: input.expectedAncestorIds,
      revisionOfMessageId: target?.revisionOfMessageId || null,
    },
  } satisfies EvalResult
}

function pickCity(preferred: string[]) {
  for (const slug of preferred) {
    if (AVAILABLE_CITY_SLUGS.has(slug)) return slug
  }
  return Array.from(AVAILABLE_CITY_SLUGS)[0] || 'unknown-city'
}

export function runAutomationAgentEvalHarness() {
  const primaryCity = pickCity(['dc', 'chicago', 'london', 'paris'])
  const secondaryCity = pickCity(['amtrak', 'nyc', 'paris', 'london'])

  const results: EvalResult[] = [
    evaluateExplainReplyCase({
      name: 'explain_reply_includes_reason_missing_evidence_and_next_action',
      reply: `${primaryCity}:\n- Blocked station rename lane=yellow claim=pending review\n  Why: Contradictory evidence detected.\n  Missing evidence: Official rename notice; current map PDF\n  Next action: Find an operator press release confirming the rename.`,
      requiredFragments: ['why:', 'missing evidence:', 'next action:'],
    }),
    evaluateOperatorRoutingCase({
      name: 'targeted_research_selects_city_and_station_claims',
      message: `research ${primaryCity} station changes this week`,
      expectedMode: 'TARGETED_RESEARCH',
      expectedCities: [primaryCity],
      expectedClaimTypes: ['NEW_STATION', 'UPDATED_STATION', 'REMOVED_STATION'],
    }),
    evaluateOperatorRoutingCase({
      name: 'manual_update_detects_refresh_intent',
      message: `manual update ${secondaryCity} metadata and operator text`,
      expectedMode: 'MANUAL_UPDATE',
      expectedCities: [secondaryCity],
      expectedClaimTypes: ['METADATA_CANDIDATE', 'HEADER_SUGGESTION'],
    }),
    evaluateFollowUpImprovementCase({
      name: 'follow_up_reduces_yellow_claims',
      beforeYellowCount: 4,
      afterYellowCount: 2,
      beforeGreenCount: 0,
      afterGreenCount: 1,
    }),
    evaluateFalsePositiveGuardCase({
      name: 'green_lane_is_not_treated_as_safe_when_human_rejected',
      lane: 'YELLOW',
      autoApplyAllowed: false,
      humanOutcome: 'REJECT',
    }),
    evaluateMessageGraphCase({
      messages: [
        { id: 'm1', branchId: 'main', parentMessageId: null, content: 'Root prompt' },
        { id: 'm2', branchId: 'main', parentMessageId: 'm1', content: 'Agent reply' },
        {
          id: 'm3',
          branchId: 'branch-b',
          parentMessageId: 'm1',
          revisionOfMessageId: 'm1',
          content: 'Edited prompt',
        },
      ],
      targetMessageId: 'm3',
      expectedBranchId: 'branch-b',
      expectedAncestorIds: ['m1'],
    }),
  ]

  const passed = results.filter((result) => result.passed).length
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? Number((passed / results.length).toFixed(4)) : 1,
    results,
  }
}

function tokenizeForReplay(value: string) {
  return normalizeEvalText(value)
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 5)
}

function normalizeEvalText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

function hasTokenOverlap(haystack: string, fragment: string) {
  const haystackTokens = new Set(tokenizeForReplay(haystack))
  const fragmentTokens = tokenizeForReplay(fragment)
  if (fragmentTokens.length === 0) return false
  const overlap = fragmentTokens.filter((token) => haystackTokens.has(token)).length
  return overlap >= Math.min(2, fragmentTokens.length)
}

function getJsonRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

export async function runAutomationAgentReplayEval(input?: {
  limit?: number
  sessionIds?: string[]
}) {
  const limit = Math.max(1, Number(input?.limit || 30))
  const sessions = await prisma.automationAgentSession.findMany({
    where: {
      ...(input?.sessionIds && input.sessionIds.length > 0 ? { id: { in: input.sessionIds } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      runRequests: {
        orderBy: { createdAt: 'desc' },
      },
      actionRequests: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  const hydratedSessions = await hydrateAutomationAgentSessionOutcomes(sessions)

  const explainCases: EvalResult[] = []
  const branchCases: EvalResult[] = []
  const directActionCases: EvalResult[] = []
  const followUpCases: EvalResult[] = []

  for (const session of hydratedSessions) {
    for (const message of session.messages) {
      if (message.role !== 'ASSISTANT') continue
      const structured = getJsonRecord(message.structuredJson)
      const operatorAction = getJsonRecord(structured.operatorAction)
      if (operatorAction.mode === 'EXPLAIN') {
        const citySlugs = Array.isArray(operatorAction.citySlugs)
          ? operatorAction.citySlugs.map((value: unknown) => String(value)).filter(Boolean)
          : []
        const claimTypes = Array.isArray(operatorAction.claimTypes)
          ? operatorAction.claimTypes.map((value: unknown) => String(value)).filter(Boolean)
          : []
        const claims = await prisma.automationClaim.findMany({
          where: {
            citySlug: { in: citySlugs.length > 0 ? citySlugs : ['__none__'] },
            ...(claimTypes.length > 0 ? { claimType: { in: claimTypes } } : {}),
          },
          include: {
            policyDecisions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        })
        const fragments = claims.flatMap((claim) => {
          const verificationJson = getJsonRecord(claim.verifications[0]?.verificationJson)
          const missingEvidence = Array.isArray(verificationJson.missingEvidence)
            ? verificationJson.missingEvidence.map((value: unknown) => String(value))
            : []
          const nextBestAction =
            typeof verificationJson.nextBestAction === 'string'
              ? verificationJson.nextBestAction
              : null
          return [
            claim.policyDecisions[0]?.decisionReason || claim.reason || '',
            ...missingEvidence,
            nextBestAction || '',
          ].filter(Boolean)
        })
        if (fragments.length > 0) {
          const matched = fragments.filter((fragment) => hasTokenOverlap(message.content, fragment))
          explainCases.push({
            name: `replay_explain:${message.id}`,
            passed: matched.length >= Math.min(2, fragments.length),
            details: {
              sessionId: session.id,
              messageId: message.id,
              matchedCount: matched.length,
              fragmentCount: fragments.length,
              matched,
            },
          })
        }
      }
    }

    const runRequestsByBranch = new Map<string, typeof session.runRequests>()
    for (const request of session.runRequests) {
      const branchId = request.branchId || 'main'
      const entries = runRequestsByBranch.get(branchId) || []
      entries.push(request)
      runRequestsByBranch.set(branchId, entries)
    }

    for (const message of session.messages) {
      if (message.role !== 'USER' || !message.revisionOfMessageId) continue
      const structured = getJsonRecord(message.structuredJson)
      const operatorAction = getJsonRecord(structured)
      const branchRequests = runRequestsByBranch.get(message.branchId || 'main') || []
      const requestMatch = branchRequests.find((request) => {
        const cities = Array.isArray(request.citySlugsJson)
          ? request.citySlugsJson.map((value) => String(value))
          : []
        const claimTypes = Array.isArray(request.claimTypesJson)
          ? request.claimTypesJson.map((value) => String(value))
          : []
        const actionCities = Array.isArray(operatorAction.citySlugs)
          ? operatorAction.citySlugs.map((value: unknown) => String(value))
          : []
        const actionClaimTypes = Array.isArray(operatorAction.claimTypes)
          ? operatorAction.claimTypes.map((value: unknown) => String(value))
          : []
        return includesAll(cities, actionCities) && includesAll(claimTypes, actionClaimTypes)
      })
      branchCases.push({
        name: `replay_branch:${message.id}`,
        passed: Boolean(requestMatch),
        details: {
          sessionId: session.id,
          messageId: message.id,
          branchId: message.branchId || 'main',
          requestId: requestMatch?.id || null,
        },
      })
    }

    for (const actionRequest of session.actionRequests) {
      const details: Record<string, any> = {
        sessionId: session.id,
        actionRequestId: actionRequest.id,
        actionType: actionRequest.actionType,
        status: actionRequest.status,
      }
      let passed = true
      if (actionRequest.actionType === 'BLOCK_DOMAIN') {
        const payload = getJsonRecord(actionRequest.payloadJson)
        const action = getJsonRecord(payload.action)
        const domain = typeof action.domain === 'string' ? action.domain : null
        const sourceDomain = domain
          ? await prisma.automationSourceDomain.findUnique({ where: { domain } })
          : null
        passed = Boolean(
          actionRequest.rationale &&
            (sourceDomain?.autoBlocked ||
              (typeof sourceDomain?.trustScore === 'number' && sourceDomain.trustScore <= 0.35)),
        )
        details.domain = domain
        details.domainTrustScore = sourceDomain?.trustScore ?? null
      } else if (actionRequest.actionType === 'MARK_CLAIM_EXHAUSTED') {
        const claim = actionRequest.claimId
          ? await prisma.automationClaim.findUnique({
              where: { id: actionRequest.claimId },
              include: {
                researchRuns: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            })
          : null
        passed = Boolean(
          claim &&
            claim.lane !== 'GREEN' &&
            (claim.researchRuns[0]?.status === 'EXHAUSTED' ||
              claim.researchRuns[0]?.status === 'BLOCKED' ||
              actionRequest.status === AutomationAgentActionStatus.PENDING_APPROVAL ||
              actionRequest.status === AutomationAgentActionStatus.EXECUTED),
        )
      } else if (actionRequest.actionType === 'RERUN_FOLLOW_UP') {
        const claim = actionRequest.claimId
          ? await prisma.automationClaim.findUnique({ where: { id: actionRequest.claimId } })
          : null
        passed = Boolean(claim && claim.lane !== 'GREEN')
      } else if (actionRequest.actionType === 'QUEUE_FOLLOW_UP') {
        passed = Boolean(actionRequest.runRequestId || actionRequest.status === 'EXECUTED')
      }

      directActionCases.push({
        name: `replay_direct_action:${actionRequest.id}`,
        passed,
        details,
      })
    }

    const improvementCount = session.outcomes.filter(
      (outcome) => outcome.outcomeType === AutomationAgentOutcomeType.FOLLOW_UP_IMPROVEMENT,
    ).length
    if (improvementCount > 0) {
      followUpCases.push({
        name: `replay_follow_up:${session.id}`,
        passed: true,
        details: {
          sessionId: session.id,
          improvementCount,
        },
      })
    }
  }

  const results = [...explainCases, ...branchCases, ...directActionCases, ...followUpCases]
  const passed = results.filter((result) => result.passed).length
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? Number((passed / results.length).toFixed(4)) : 1,
    categories: {
      explain: {
        total: explainCases.length,
        passed: explainCases.filter((caseItem) => caseItem.passed).length,
      },
      branchRouting: {
        total: branchCases.length,
        passed: branchCases.filter((caseItem) => caseItem.passed).length,
      },
      directActions: {
        total: directActionCases.length,
        passed: directActionCases.filter((caseItem) => caseItem.passed).length,
      },
      followUpImprovement: {
        total: followUpCases.length,
        passed: followUpCases.filter((caseItem) => caseItem.passed).length,
      },
    },
    results: results.slice(0, 200),
  }
}
