import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { advanceCasualPlaylistRun } from '@/lib/progression'
import { prisma } from '@/lib/prisma'

const advanceSchema = z.object({
  playlistRunId: z.string().trim().min(1),
  citySlug: z.string().trim().min(1),
  completionMs: z.number().int().min(0).nullable().optional(),
  accuracy: z.number().min(0).max(1).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = advanceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid playlist progress payload.' }, { status: 400 })
  }

  const updated = await advanceCasualPlaylistRun({
    playlistRunId: parsed.data.playlistRunId,
    userId: user.id,
    citySlug: parsed.data.citySlug,
    completionMs: parsed.data.completionMs ?? null,
    accuracy: parsed.data.accuracy ?? null,
  })

  if (!updated) {
    return NextResponse.json({ error: 'Playlist run not found.' }, { status: 404 })
  }

  const playlistRun = await prisma.playlistRun.findUnique({
    where: { id: updated.id },
    include: {
      playlist: {
        include: {
          items: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  })
  const nextItem =
    playlistRun && playlistRun.status === 'ACTIVE'
      ? playlistRun.playlist.items[playlistRun.currentIndex] ?? null
      : null

  return NextResponse.json({
    run: {
      id: updated.id,
      status: updated.status,
      currentIndex: updated.currentIndex,
      completedLegs: updated.completedLegs,
      totalLegs: updated.totalLegs,
      aggregateCompletionMs: updated.aggregateCompletionMs,
      aggregateAccuracy: updated.aggregateAccuracy,
      completedAt: updated.completedAt?.toISOString() ?? null,
    },
    nextHref: nextItem ? `${nextItem.cityPath}?playlistRunId=${updated.id}` : null,
  })
}
