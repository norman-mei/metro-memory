import { AutomationDecisionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import {
  getAutomationReviewerLabel,
  isAutomationAdminAuthenticated,
} from '@/lib/adminAuth'
import { bulkUpdateAutomationCandidateDecision } from '@/lib/automationReview'

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const rawStatus = String(formData.get('status') || '').toUpperCase()
  const note = String(formData.get('note') || '')
  const candidateIds = formData
    .getAll('candidateIds')
    .map((value) => String(value))
    .filter(Boolean)

  if (
    rawStatus !== AutomationDecisionStatus.APPROVED &&
    rawStatus !== AutomationDecisionStatus.REJECTED
  ) {
    return NextResponse.json({ error: 'Invalid bulk action.' }, { status: 400 })
  }

  try {
    const reviewer = await getAutomationReviewerLabel()
    const result = await bulkUpdateAutomationCandidateDecision({
      candidateIds,
      status: rawStatus as AutomationDecisionStatus,
      note,
      reviewer,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bulk review failed.',
      },
      { status: 400 },
    )
  }
}
