import {
  AutomationAgentEventType,
  AutomationAgentOutcomeType,
  AutomationLane,
  AutomationMetricScope,
  AutomationResearchMemoryKind,
} from '@prisma/client'
import { NextResponse } from 'next/server'

import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import {
  refreshAutomationAuditMetrics,
  updateAutomationDomainOverride,
  updateAutomationPolicyMetricOverride,
} from '@/lib/automationAudit'
import { recordAutomationAgentEvent, recordAutomationAgentOutcome } from '@/lib/automationRunRequests'
import { rememberAutomationResearchMemory } from '@/lib/automationResearchMemory'

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const kind = String(body.kind || '')
    const key = String(body.key || '').trim()

    if (!key) {
      return NextResponse.json({ error: 'Missing override key.' }, { status: 400 })
    }

    const manualTrustScore =
      typeof body.manualTrustScore === 'number' && Number.isFinite(body.manualTrustScore)
        ? Math.max(0, Math.min(1, body.manualTrustScore))
        : null
    const overrideReason =
      typeof body.overrideReason === 'string' ? body.overrideReason : null

    if (kind === 'domain') {
      await updateAutomationDomainOverride({
        domain: key,
        manualBlocked:
          typeof body.manualBlocked === 'boolean' ? body.manualBlocked : null,
        manualTrustScore,
        overrideReason,
      })
      await rememberAutomationResearchMemory({
        kind: AutomationResearchMemoryKind.DOMAIN_RECIPE,
        key: `override:${key}`,
        domain: key,
        valueJson: {
          manualBlocked:
            typeof body.manualBlocked === 'boolean' ? body.manualBlocked : null,
          manualTrustScore,
          overrideReason,
        },
        trustScore: 1,
      }).catch(() => null)
      if (body.manualBlocked === true) {
        await recordAutomationAgentEvent({
          createdBy: 'automation-trust-route',
          eventType: AutomationAgentEventType.DOMAIN_BLOCKED,
          summaryJson: {
            domain: key,
            overrideReason,
          },
        }).catch(() => null)
      }
    } else if (kind === 'city' || kind === 'claimType') {
      await updateAutomationPolicyMetricOverride({
        scope:
          kind === 'city'
            ? AutomationMetricScope.CITY
            : AutomationMetricScope.CLAIM_TYPE,
        key,
        manualTrustScore,
        forcedLane:
          body.forcedLane === AutomationLane.YELLOW || body.forcedLane === AutomationLane.RED
            ? body.forcedLane
            : null,
        overrideReason,
      })
      await rememberAutomationResearchMemory({
        kind: AutomationResearchMemoryKind.HISTORICAL_FACT,
        key: `override:${kind}:${key}`,
        ...(kind === 'city' ? { citySlug: key } : {}),
        valueJson: {
          kind,
          key,
          manualTrustScore,
          forcedLane:
            body.forcedLane === AutomationLane.YELLOW || body.forcedLane === AutomationLane.RED
              ? body.forcedLane
              : null,
          overrideReason,
        },
        trustScore: 1,
      }).catch(() => null)
    } else {
      return NextResponse.json({ error: 'Invalid override kind.' }, { status: 400 })
    }

    await refreshAutomationAuditMetrics()
    await recordAutomationAgentOutcome({
      outcomeType: AutomationAgentOutcomeType.PLANNER_DEFAULT,
      summaryJson: {
        kind,
        key,
        manualTrustScore,
        overrideReason,
      },
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update trust override.',
      },
      { status: 400 },
    )
  }
}
