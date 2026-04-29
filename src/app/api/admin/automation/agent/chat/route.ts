import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { processAutomationAgentChat } from '@/lib/automationAgentChat'

const requestSchema = z.object({
  sessionId: z.string().optional(),
  branchId: z.string().optional(),
  parentMessageId: z.string().optional(),
  editMessageId: z.string().optional(),
  regenerateMessageId: z.string().optional(),
  message: z.string().min(1).max(4000),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid chat payload.' }, { status: 400 })
  }

  try {
    const reviewer = await getAutomationReviewerLabel()
    const result = await processAutomationAgentChat({
      reviewer,
      sessionId: parsed.data.sessionId,
      branchId: parsed.data.branchId,
      parentMessageId: parsed.data.parentMessageId,
      editMessageId: parsed.data.editMessageId,
      regenerateMessageId: parsed.data.regenerateMessageId,
      message: parsed.data.message,
    })

    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      branchId: result.branchId,
      operatorAction: result.operatorAction,
      directAction: result.directAction,
      actionRequestId: result.actionRequestId,
      runRequestId: result.runRequestId,
      assistantMessage: result.assistantMessage,
      assistantMessageId: result.assistantMessageId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Automation agent request failed.',
      },
      { status: 400 },
    )
  }
}
