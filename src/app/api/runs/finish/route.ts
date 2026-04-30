import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DAILY_RETRY_REASON } from '@/lib/ranked'

const finishSchema = z.object({
  sessionId: z.string().trim().min(1),
  completionPercent: z.number().min(0).max(1),
  completionMs: z.number().int().positive().max(1000 * 60 * 60 * 24).nullable().optional(),
  first50Ms: z.number().int().positive().max(1000 * 60 * 60 * 24).nullable().optional(),
  correctGuessCount: z.number().int().min(0).max(100000),
  correctStationCount: z.number().int().min(0).max(100000),
  wrongGuessCount: z.number().int().min(0).max(100000),
  repeatedGuessCount: z.number().int().min(0).max(100000),
  hintCount: z.number().int().min(0).max(100000).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = finishSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid finish payload.' }, { status: 400 })
  }

  const session = await prisma.runSession.findUnique({
    where: { id: parsed.data.sessionId },
  })
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 })
  }

  let rankedEligible = session.rankedEligible && !session.revealUsed
  let disqualificationReason = session.disqualificationReason

  if (
    rankedEligible &&
    session.ruleset === 'ONE_LIFE' &&
    parsed.data.wrongGuessCount > 0 &&
    parsed.data.completionPercent < 0.9999
  ) {
    rankedEligible = false
    disqualificationReason = 'ONE_LIFE_FAILED'
  }

  if (rankedEligible && session.dailyChallengeId) {
    const priorRankedDaily = await prisma.runSession.findFirst({
      where: {
        userId: user.id,
        dailyChallengeId: session.dailyChallengeId,
        status: 'COMPLETED',
        rankedEligible: true,
        id: { not: session.id },
      },
      select: { id: true },
    })

    if (priorRankedDaily) {
      rankedEligible = false
      disqualificationReason = DAILY_RETRY_REASON
    }
  }

  const endedAt = new Date()
  const startedAt = session.startedAt.getTime()
  const completionMs = parsed.data.completionMs ?? Math.max(1, endedAt.getTime() - startedAt)

  const updated = await prisma.runSession.update({
    where: { id: session.id },
    data: {
      status: 'COMPLETED',
      endedAt,
      completionPercent: parsed.data.completionPercent,
      completionMs,
      first50Ms: parsed.data.first50Ms ?? null,
      correctGuessCount: parsed.data.correctGuessCount,
      correctStationCount: parsed.data.correctStationCount,
      wrongGuessCount: parsed.data.wrongGuessCount,
      repeatedGuessCount: parsed.data.repeatedGuessCount,
      hintCount: parsed.data.hintCount ?? session.hintCount,
      rankedEligible,
      disqualificationReason,
    },
    select: {
      id: true,
      rankedEligible: true,
      disqualificationReason: true,
      completionMs: true,
    },
  })

  return NextResponse.json({
    result: {
      id: updated.id,
      rankedEligible: updated.rankedEligible,
      disqualificationReason: updated.disqualificationReason,
      completionMs: updated.completionMs,
      xpAwarded: null,
      countedForStreak: null,
      level: null,
      lifetimeXp: null,
      currentStreak: null,
      bestStreak: null,
    },
  })
}
