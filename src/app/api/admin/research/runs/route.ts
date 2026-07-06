import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { runResearch } from '@/lib/research/pipeline'

export const maxDuration = 300

const schema = z.object({
  citySlugs: z.array(z.string().min(1)).min(1).max(20),
  scope: z.string().max(200).optional(),
  trigger: z.enum(['MANUAL', 'SCHEDULED', 'CHAT']).optional(),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run payload.' }, { status: 400 })
  }

  try {
    const reviewer = await getAutomationReviewerLabel()
    const summary = await runResearch({
      citySlugs: parsed.data.citySlugs,
      scope: parsed.data.scope ?? null,
      trigger: parsed.data.trigger ?? 'MANUAL',
      reviewer,
    })
    return NextResponse.json({ summary })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research run failed.' },
      { status: 500 },
    )
  }
}
