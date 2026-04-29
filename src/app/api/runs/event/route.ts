import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RANKED_REVEAL_REASON } from '@/lib/ranked'

const eventSchema = z.object({
  sessionId: z.string().trim().min(1),
  type: z.enum(['hint', 'reveal', 'mapNames']),
  amount: z.number().int().min(1).max(25).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 })
  }

  const session = await prisma.runSession.findUnique({
    where: { id: parsed.data.sessionId },
  })

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 })
  }

  if (parsed.data.type === 'hint') {
    const updated = await prisma.runSession.update({
      where: { id: session.id },
      data: {
        hintCount: {
          increment: parsed.data.amount ?? 1,
        },
      },
      select: {
        id: true,
        hintCount: true,
        rankedEligible: true,
        disqualificationReason: true,
      },
    })
    return NextResponse.json({ session: updated })
  }

  const updated = await prisma.runSession.update({
    where: { id: session.id },
    data: {
      revealUsed: true,
      rankedEligible: false,
      disqualificationReason: RANKED_REVEAL_REASON,
    },
    select: {
      id: true,
      hintCount: true,
      rankedEligible: true,
      disqualificationReason: true,
      revealUsed: true,
    },
  })

  return NextResponse.json({ session: updated })
}
