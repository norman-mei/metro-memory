import { buildAutomationClaimResearchState } from '@/lib/automationClaimState'
import { prisma } from '@/lib/prisma'

type ExplainInput = {
  citySlugs: string[]
  claimTypes?: string[]
  limitPerCity?: number
}

function normalizeClaimTypes(claimTypes?: string[]) {
  return Array.from(
    new Set((claimTypes || []).map((value) => String(value).trim().toUpperCase()).filter(Boolean)),
  )
}

function parseVerificationJson(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

function parseRunSummary(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

function formatCitation(citation: {
  sourceUrl: string | null
  locatorType: string
  excerpt: string
  pageNumber: number | null
  domSelector: string | null
}) {
  const locator =
    citation.locatorType === 'PDF_PAGE' && typeof citation.pageNumber === 'number'
      ? `page ${citation.pageNumber}`
      : citation.locatorType === 'HTML_SELECTOR' && citation.domSelector
        ? citation.domSelector
        : citation.locatorType.toLowerCase().replaceAll('_', ' ')
  const excerpt = citation.excerpt.replace(/\s+/g, ' ').trim().slice(0, 180)
  return `${locator}: "${excerpt}"${citation.sourceUrl ? ` (${citation.sourceUrl})` : ''}`
}

function formatTask(task: {
  taskType: string
  status: string
  retryCount: number
  blockedReason: string | null
  nextActionHint: string | null
}) {
  const parts = [
    `${task.taskType.toLowerCase().replaceAll('_', ' ')}: ${task.status.toLowerCase().replaceAll('_', ' ')}`,
  ]
  if (task.retryCount > 0) {
    parts.push(`retries=${task.retryCount}`)
  }
  if (task.blockedReason) {
    parts.push(task.blockedReason)
  } else if (task.nextActionHint) {
    parts.push(task.nextActionHint)
  }
  return parts.join(' | ')
}

export async function buildAutomationExplainReply({
  citySlugs,
  claimTypes,
  limitPerCity = 3,
}: ExplainInput) {
  if (citySlugs.length === 0) {
    return 'I need at least one exact city slug to explain the current automation state.'
  }

  const normalizedClaimTypes = normalizeClaimTypes(claimTypes)
  const claims = await prisma.automationClaim.findMany({
    where: {
      citySlug: { in: citySlugs },
      ...(normalizedClaimTypes.length > 0 ? { claimType: { in: normalizedClaimTypes } } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, citySlugs.length * Math.max(1, limitPerCity) * 4),
    include: {
      candidate: {
        include: {
          decisions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      verifications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      policyDecisions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      researchRuns: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          tasks: {
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            take: 5,
          },
        },
      },
      citations: {
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          artifact: true,
          researchTask: true,
        },
      },
      _count: {
        select: {
          evidenceNodes: true,
          evidenceEdges: true,
          citations: true,
          researchRuns: true,
          researchTasks: true,
        },
      },
    },
  })

  const lines: string[] = []
  for (const citySlug of citySlugs) {
    const cityClaims = claims
      .filter((claim) => claim.citySlug === citySlug)
      .sort((left, right) => {
        const leftBlocked = left.lane === 'RED' ? 0 : left.lane === 'YELLOW' ? 1 : 2
        const rightBlocked = right.lane === 'RED' ? 0 : right.lane === 'YELLOW' ? 1 : 2
        return leftBlocked - rightBlocked || right.updatedAt.getTime() - left.updatedAt.getTime()
      })
      .slice(0, limitPerCity)

    if (lines.length > 0) {
      lines.push('')
    }
    lines.push(`${citySlug}:`)

    if (cityClaims.length === 0) {
      lines.push('No matching claims were found in recent automation state.')
      continue
    }

    for (const claim of cityClaims) {
      const verificationJson = parseVerificationJson(claim.verifications[0]?.verificationJson)
      const runSummary = parseRunSummary(claim.researchRuns[0]?.summary)
      const missingEvidence = Array.isArray(verificationJson.missingEvidence)
        ? verificationJson.missingEvidence.map((value: unknown) => String(value)).slice(0, 4)
        : []
      const nextBestAction =
        typeof verificationJson.nextBestAction === 'string'
          ? verificationJson.nextBestAction
          : typeof runSummary.nextBestAction === 'string'
            ? runSummary.nextBestAction
            : null
      const evidenceGraph =
        verificationJson.evidenceGraphSummary &&
        typeof verificationJson.evidenceGraphSummary === 'object'
          ? (verificationJson.evidenceGraphSummary as Record<string, any>)
          : null
      const latestPolicy = claim.policyDecisions[0]
      const latestResearchRun = claim.researchRuns[0]
      const claimResearchState = buildAutomationClaimResearchState({
        lane: claim.lane,
        autoApplyEligible: claim.autoApplyEligible,
        verificationJson,
        tasks: latestResearchRun?.tasks || [],
        researchRuns: latestResearchRun
          ? [
              {
                id: latestResearchRun.id,
                status: latestResearchRun.status,
                attemptNumber: latestResearchRun.attemptNumber,
              },
            ]
          : [],
        latestResearchRunId: latestResearchRun?.id || null,
      })

      lines.push(
        `- ${claim.title} [${claim.claimType.toLowerCase().replaceAll('_', ' ')}] lane=${claim.lane.toLowerCase()} claim=${claim.status.toLowerCase().replaceAll('_', ' ')}`,
      )
      lines.push(
        `  Why: ${latestPolicy?.decisionReason || claim.reason || 'No policy decision reason recorded.'}`,
      )
      lines.push(
        `  State: ${claimResearchState.status.toLowerCase()}${claimResearchState.nextTask ? `; next task=${claimResearchState.nextTask.taskType.toLowerCase()}` : ''}. ${claimResearchState.statusReason}`,
      )
      if (missingEvidence.length > 0) {
        lines.push(`  Missing evidence: ${missingEvidence.join('; ')}`)
      } else {
        lines.push('  Missing evidence: none recorded.')
      }
      lines.push(`  Next action: ${nextBestAction || 'No next action recorded.'}`)
      if (latestResearchRun) {
        const taskSummary = latestResearchRun.tasks.length
          ? latestResearchRun.tasks.map(formatTask).join(' || ')
          : 'No follow-up tasks recorded.'
        lines.push(
          `  Research: ${latestResearchRun.status.toLowerCase()} attempt ${latestResearchRun.attemptNumber}. ${taskSummary}`,
        )
      } else {
        lines.push('  Research: no follow-up run recorded.')
      }
      if (evidenceGraph) {
        lines.push(
          `  Evidence graph: nodes=${Number(evidenceGraph.nodeCount || claim._count.evidenceNodes)} edges=${Number(
            evidenceGraph.edgeCount || claim._count.evidenceEdges,
          )} supports=${Number(evidenceGraph.supportCount || 0)} contradictions=${Number(
            evidenceGraph.contradictionCount || 0,
          )}`,
        )
      }
      if (claim.citations.length > 0) {
        lines.push(
          `  Citations: ${claim.citations
            .slice(0, 2)
            .map((citation) =>
              formatCitation({
                sourceUrl: citation.sourceUrl,
                locatorType: citation.locatorType,
                excerpt: citation.excerpt,
                pageNumber: citation.pageNumber,
                domSelector: citation.domSelector,
              }),
            )
            .join(' || ')}`,
        )
      } else {
        lines.push('  Citations: none persisted for this claim yet.')
      }
    }
  }

  return lines.join('\n')
}
