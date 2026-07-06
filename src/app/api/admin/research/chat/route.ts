import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { handleChatTurn } from '@/lib/research/chat'

export const maxDuration = 300

const schema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid chat payload.' }, { status: 400 })
  }

  try {
    const reviewer = await getAutomationReviewerLabel()
    const result = await handleChatTurn({
      message: parsed.data.message,
      sessionId: parsed.data.sessionId ?? null,
      reviewer,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat request failed.' },
      { status: 500 },
    )
  }
}
