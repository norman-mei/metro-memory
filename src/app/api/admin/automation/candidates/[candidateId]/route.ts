import { AutomationDecisionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  getAutomationReviewerLabel,
  isAutomationAdminAuthenticated,
} from '@/lib/adminAuth'
import { updateAutomationCandidateDecision } from '@/lib/automationReview'

const updateSchema = z.object({
  status: z.nativeEnum(AutomationDecisionStatus),
  note: z.string().max(1000).optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ candidateId: string }> },
) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review payload.' }, { status: 400 })
  }

  const { candidateId } = await context.params

  try {
    const reviewer = await getAutomationReviewerLabel()
    const candidate = await updateAutomationCandidateDecision({
      candidateId,
      status: parsed.data.status,
      note: parsed.data.note,
      reviewer,
    })

    return NextResponse.json({ candidate })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update candidate.',
      },
      { status: 400 },
    )
  }
}
