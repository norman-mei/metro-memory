import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { decideClaim } from '@/lib/research/queue'

const schema = z.object({
  decision: z.enum(['approve', 'reject', 'apply']),
  notes: z.string().max(2000).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid decision payload.' }, { status: 400 })
  }

  const { id } = await context.params
  try {
    const reviewer = await getAutomationReviewerLabel()
    const claim = await decideClaim({
      id,
      decision: parsed.data.decision,
      reviewer,
      notes: parsed.data.notes ?? null,
    })
    return NextResponse.json({ claim })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update claim.' },
      { status: 400 },
    )
  }
}
