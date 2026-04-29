import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { findRankedCity } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'

const playlistSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  citySlugs: z.array(z.string().trim().min(1)).min(1).max(24),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      items: playlist.items.map((item) => ({
        citySlug: item.citySlug,
        cityPath: item.cityPath,
        orderIndex: item.orderIndex,
      })),
      runs: playlist.runs.map((run) => ({
        id: run.id,
        mode: run.mode,
        ruleset: run.ruleset,
        status: run.status,
        completedLegs: run.completedLegs,
        totalLegs: run.totalLegs,
        aggregateCompletionMs: run.aggregateCompletionMs,
        aggregateAccuracy: run.aggregateAccuracy,
        createdAt: run.createdAt.toISOString(),
      })),
    })),
  })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = playlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid playlist payload.' }, { status: 400 })
  }

  const items = parsed.data.citySlugs
    .map((citySlug, orderIndex) => {
      const city = findRankedCity(citySlug)
      if (!city) {
        return null
      }
      return {
        citySlug,
        cityPath: city.path,
        orderIndex,
      }
    })
    .filter((item): item is { citySlug: string; cityPath: string; orderIndex: number } => Boolean(item))

  if (items.length !== parsed.data.citySlugs.length) {
    return NextResponse.json({ error: 'Unknown city in playlist.' }, { status: 404 })
  }

  const playlist = await prisma.playlist.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      items: {
        create: items,
      },
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      items: playlist.items.map((item) => ({
        citySlug: item.citySlug,
        cityPath: item.cityPath,
        orderIndex: item.orderIndex,
      })),
    },
  })
}
