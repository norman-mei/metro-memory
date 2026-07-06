import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { bulkDecide } from '@/lib/research/queue'

const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  decision: z.enum(['approve', 'reject', 'apply']),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid bulk decision payload.' }, { status: 400 })
  }

  try {
    const reviewer = await getAutomationReviewerLabel()
    const count = await bulkDecide({
      ids: parsed.data.ids,
      decision: parsed.data.decision,
      reviewer,
    })
    return NextResponse.json({ count })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update claims.' },
      { status: 400 },
    )
  }
}
