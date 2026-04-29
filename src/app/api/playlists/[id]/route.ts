import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { findRankedCity } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'

const updatePlaylistSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).optional(),
  citySlugs: z.array(z.string().trim().min(1)).min(1).max(24).optional(),
})

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, { params }: RouteParams) {
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
      runs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 })
  }

  return NextResponse.json({
    playlist: {
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
        currentIndex: run.currentIndex,
        completedLegs: run.completedLegs,
        totalLegs: run.totalLegs,
        aggregateCompletionMs: run.aggregateCompletionMs,
        aggregateAccuracy: run.aggregateAccuracy,
        lastCompletedCitySlug: run.lastCompletedCitySlug,
        createdAt: run.createdAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      })),
    },
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updatePlaylistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid playlist payload.' }, { status: 400 })
  }

  if (parsed.data.citySlugs) {
    const items = parsed.data.citySlugs
      .map((citySlug, orderIndex) => {
        const city = findRankedCity(citySlug)
        if (!city) {
          return null
        }
        return {
          playlistId: id,
          citySlug,
          cityPath: city.path,
          orderIndex,
        }
      })
      .filter((item): item is { playlistId: string; citySlug: string; cityPath: string; orderIndex: number } => Boolean(item))
    if (items.length !== parsed.data.citySlugs.length) {
      return NextResponse.json({ error: 'Unknown city in playlist.' }, { status: 404 })
    }
    await prisma.playlistItem.deleteMany({
      where: { playlistId: id },
    })
    await prisma.playlistItem.createMany({
      data: items,
    })
  }

  const updated = await prisma.playlist.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  return NextResponse.json({
    playlist: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      items: updated.items.map((item) => ({
        citySlug: item.citySlug,
        cityPath: item.cityPath,
        orderIndex: item.orderIndex,
      })),
    },
  })
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: 'Playlist not found.' }, { status: 404 })
  }

  await prisma.playlist.delete({
    where: { id },
  })

  return NextResponse.json({ ok: true })
}
