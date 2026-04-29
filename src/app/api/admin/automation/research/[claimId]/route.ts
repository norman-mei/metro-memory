import { NextResponse } from 'next/server'
import { AutomationResearchTaskStatus } from '@prisma/client'
import { z } from 'zod'

import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { refreshAutomationAuditMetrics } from '@/lib/automationAudit'
import {
  overrideResearchFollowUpStatusAdmin,
  scheduleFollowUpResearchForClaimAdmin,
} from '@/lib/automationResearchAdmin'

const actionSchema = z.object({
  action: z.enum(['rerun', 'markBlocked', 'markExhausted', 'blockTask']),
  reason: z.string().max(1000).optional(),
  taskId: z.string().optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid research action payload.' }, { status: 400 })
  }

  const { claimId } = await context.params

  try {
    if (parsed.data.action === 'rerun') {
      const result = await scheduleFollowUpResearchForClaimAdmin(claimId, { force: true })
      await refreshAutomationAuditMetrics()
      return NextResponse.json({ ok: true, result })
    }

    if (parsed.data.action === 'blockTask') {
      if (!parsed.data.taskId) {
        return NextResponse.json({ error: 'Missing task id.' }, { status: 400 })
      }
      const result = await overrideResearchFollowUpStatusAdmin({
        claimId,
        taskId: parsed.data.taskId,
        status: AutomationResearchTaskStatus.BLOCKED,
        reason: parsed.data.reason,
      })
      await refreshAutomationAuditMetrics()
      return NextResponse.json({ ok: true, result })
    }

    const result = await overrideResearchFollowUpStatusAdmin({
      claimId,
      status:
        parsed.data.action === 'markBlocked'
          ? AutomationResearchTaskStatus.BLOCKED
          : AutomationResearchTaskStatus.EXHAUSTED,
      reason: parsed.data.reason,
    })
    await refreshAutomationAuditMetrics()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update research follow-up state.',
      },
      { status: 400 },
    )
  }
}
