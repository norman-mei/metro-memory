import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import {
  getMiniCityFamilyParentSlug,
  normalizeFoundIds,
  normalizeFoundTimestamps,
} from '@/lib/miniCityProgressServer'
import { prisma } from '@/lib/prisma'
import { mergeProgressPayloads } from '@/lib/progressMerge'

const syncRecordSchema = z.object({
  citySlug: z.string().min(1),
  foundIds: z.array(z.number().int().nonnegative()).max(10000),
  foundTimestamps: z.record(z.string(), z.string()).optional(),
  updatedAt: z.string().optional(),
  deviceId: z.string().optional(),
})

const syncSchema = z.object({
  deviceId: z.string().optional(),
  records: z.array(syncRecordSchema).max(250),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = syncSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const inputBySlug = new Map<
    string,
    { foundIds: number[]; foundTimestamps: Record<string, string> }
  >()

  for (const record of parsed.data.records) {
    const targetCitySlug = getMiniCityFamilyParentSlug(record.citySlug) ?? record.citySlug
    const incoming = {
      foundIds: normalizeFoundIds(record.foundIds),
      foundTimestamps: normalizeFoundTimestamps(record.foundTimestamps),
    }
    const mergedInput = mergeProgressPayloads(
      inputBySlug.get(targetCitySlug),
      incoming,
    )
    inputBySlug.set(targetCitySlug, {
      foundIds: mergedInput.foundIds,
      foundTimestamps: mergedInput.foundTimestamps ?? {},
    })
  }

  const records = []
  const syncedAt = new Date().toISOString()

  for (const [citySlug, incoming] of inputBySlug.entries()) {
    const existing = await prisma.progress.findUnique({
      where: {
        userId_citySlug: {
          userId: user.id,
          citySlug,
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
      incoming,
    )

    await prisma.progress.upsert({
      where: {
        userId_citySlug: {
          userId: user.id,
          citySlug,
        },
      },
      update: {
        foundIds: merged.foundIds,
        foundTimestamps: merged.foundTimestamps ?? {},
      },
      create: {
        userId: user.id,
        citySlug,
        foundIds: merged.foundIds,
        foundTimestamps: merged.foundTimestamps ?? {},
      },
    })

    records.push({
      citySlug,
      foundIds: merged.foundIds,
      foundTimestamps: merged.foundTimestamps,
    })
  }

  return NextResponse.json({ ok: true, syncedAt, records })
}
