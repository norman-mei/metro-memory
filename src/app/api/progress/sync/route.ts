import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import {
  getMiniCityFamilyParentSlug,
  normalizeFoundIds,
  normalizeFoundTimestamps,
} from '@/lib/miniCityProgressServer'
import { mergeProgressPayloads } from '@/lib/progressMerge'
import { persistMergedProgress } from '@/lib/progressPersistence'

// Cap in-flight transactions so a 250-record sync doesn't exhaust the pool,
// while still avoiding the old one-slug-at-a-time serial round trips.
const SYNC_CONCURRENCY = 8

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

  const syncedAt = new Date().toISOString()
  const entries = Array.from(inputBySlug.entries())
  const records: Array<{
    citySlug: string
    foundIds: number[]
    foundTimestamps: Record<string, string>
  }> = []

  for (let start = 0; start < entries.length; start += SYNC_CONCURRENCY) {
    const batch = entries.slice(start, start + SYNC_CONCURRENCY)
    const merged = await Promise.all(
      batch.map(([citySlug, incoming]) =>
        persistMergedProgress(user.id, citySlug, incoming).then((result) => ({
          citySlug,
          ...result,
        })),
      ),
    )
    records.push(...merged)
  }

  return NextResponse.json({ ok: true, syncedAt, records })
}
