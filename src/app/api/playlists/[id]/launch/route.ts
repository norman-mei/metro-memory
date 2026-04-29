import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import {
  formatPlaylistLaunchMode,
  parsePlaylistLaunchMode,
  resolvePlaylistRunRuleset,
  toPrismaPlaylistLaunchMode,
} from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'
import { buildRankedHref, parseRankedRuleset, toPrismaRankedRuleset } from '@/lib/ranked'

const launchSchema = z.object({
  mode: z.enum(['casual', 'ranked-classic', 'ranked-ruleset']),
  ruleset: z.string().trim().optional(),
})

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = launchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid launch payload.' }, { status: 400 })
  }

  const mode = parsePlaylistLaunchMode(parsed.data.mode)
  const playlistRuleset = resolvePlaylistRunRuleset({
    mode,
    ruleset: parsed.data.ruleset ? parseRankedRuleset(parsed.data.ruleset) : null,
  })
  const firstItem = playlist.items[0]
  if (!firstItem) {
    return NextResponse.json({ error: 'Playlist has no cities.' }, { status: 409 })
  }

  const run = await prisma.playlistRun.create({
    data: {
      playlistId: playlist.id,
      userId: user.id,
      mode: toPrismaPlaylistLaunchMode(mode),
      ruleset: playlistRuleset ? toPrismaRankedRuleset(playlistRuleset) : null,
      totalLegs: playlist.items.length,
    },
  })

  const href =
    mode === 'casual'
      ? `${firstItem.cityPath}?playlistRunId=${run.id}`
      : buildRankedHref(firstItem.cityPath, {
          ranked: true,
          ruleset: playlistRuleset ?? 'classic',
          source: 'free-play',
          playlistRunId: run.id,
        })

  return NextResponse.json({
    run: {
      id: run.id,
      mode,
      modeLabel: formatPlaylistLaunchMode(mode),
      href,
    },
  })
}
