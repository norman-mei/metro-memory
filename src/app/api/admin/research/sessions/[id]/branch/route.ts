import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { branchSession } from '@/lib/research/sessions'

const schema = z.object({ messageId: z.string().min(1) })

export async function POST(req: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const reviewer = await getAutomationReviewerLabel()
  const sessionId = await branchSession(parsed.data.messageId, reviewer)
  if (!sessionId) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  return NextResponse.json({ sessionId })
}
