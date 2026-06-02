import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import {
  getMiniCityFamilyParentSlug,
  getMiniCityFamilySlugs,
  normalizeFoundIds,
  normalizeFoundTimestamps,
  resolveProgressPayloadForSlug,
} from '@/lib/miniCityProgressServer'
import { prisma } from '@/lib/prisma'
import { mergeProgressPayloads } from '@/lib/progressMerge'

type RouteParams = {
  params: Promise<{
    citySlug: string
  }>
}

const progressSchema = z.object({
  foundIds: z.array(z.number().int().nonnegative()).max(10000),
  foundTimestamps: z.record(z.string(), z.string()).optional(),
})

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { citySlug } = await params
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!citySlug) {
    return NextResponse.json({ error: 'Missing city' }, { status: 400 })
  }

  const familyParentSlug = getMiniCityFamilyParentSlug(citySlug)
  const records = familyParentSlug
    ? await prisma.progress.findMany({
        where: {
          userId: user.id,
          citySlug: {
            in: getMiniCityFamilySlugs(familyParentSlug),
          },
        },
      })
    : await prisma.progress
        .findUnique({
          where: {
            userId_citySlug: {
              userId: user.id,
              citySlug,
            },
          },
        })
        .then((record) => (record ? [record] : []))

  const resolved = await resolveProgressPayloadForSlug(records, citySlug)

  if (!resolved) {
    return NextResponse.json({ progress: null })
  }

  return NextResponse.json({
    progress: {
      foundIds: resolved.foundIds,
      foundTimestamps: resolved.foundTimestamps,
    },
  })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { citySlug } = await params
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!citySlug) {
    return NextResponse.json({ error: 'Missing city' }, { status: 400 })
  }

  const json = await request.json().catch(() => null)
  const parsed = progressSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const uniqueIds = normalizeFoundIds(parsed.data.foundIds)
  const foundTimestamps: Record<string, string> = parsed.data.foundTimestamps ?? {}
  const familyParentSlug = getMiniCityFamilyParentSlug(citySlug)
  const targetCitySlug = familyParentSlug ?? citySlug
  const existing = await prisma.progress.findUnique({
    where: {
      userId_citySlug: {
        userId: user.id,
        citySlug: targetCitySlug,
      },
    },
  })
  const merged = mergeProgressPayloads(
    existing
      ? {
          foundIds: normalizeFoundIds(existing.foundIds),
          foundTimestamps: normalizeFoundTimestamps(existing.foundTimestamps),
        }
      : null,
    {
      foundIds: uniqueIds,
      foundTimestamps,
    },
  )

  await prisma.progress.upsert({
    where: {
      userId_citySlug: {
        userId: user.id,
        citySlug: targetCitySlug,
      },
    },
    update: {
      foundIds: merged.foundIds,
      foundTimestamps: merged.foundTimestamps ?? {},
    },
    create: {
      userId: user.id,
      citySlug: targetCitySlug,
      foundIds: merged.foundIds,
      foundTimestamps: merged.foundTimestamps ?? {},
    },
  })

  return NextResponse.json({ ok: true, foundCount: merged.foundIds.length })
}
