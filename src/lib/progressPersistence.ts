import { Prisma } from '@prisma/client'

import {
  normalizeFoundIds,
  normalizeFoundTimestamps,
} from '@/lib/miniCityProgressServer'
import { prisma } from '@/lib/prisma'
import { mergeProgressPayloads, type ProgressPayload } from '@/lib/progressMerge'

export type PersistedProgress = {
  foundIds: number[]
  foundTimestamps: Record<string, string>
}

// Postgres raises a serialization failure / deadlock when two Serializable
// transactions touch the same row concurrently. Prisma surfaces those as P2034.
const isRetryableTransactionError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'

const runMergeUpsert = async (
  userId: string,
  citySlug: string,
  incoming: ProgressPayload,
): Promise<PersistedProgress> =>
  prisma.$transaction(
    async (tx) => {
      const existing = await tx.progress.findUnique({
        where: { userId_citySlug: { userId, citySlug } },
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

      const foundTimestamps = merged.foundTimestamps ?? {}

      await tx.progress.upsert({
        where: { userId_citySlug: { userId, citySlug } },
        update: { foundIds: merged.foundIds, foundTimestamps },
        create: { userId, citySlug, foundIds: merged.foundIds, foundTimestamps },
      })

      return { foundIds: merged.foundIds, foundTimestamps }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

/**
 * Atomically merges the incoming progress into the stored row for
 * (userId, citySlug). Runs at Serializable isolation so concurrent writers
 * (multiple devices, or a batch sync racing a single-city save) cannot clobber
 * each other's newly-found stations; on a write conflict it retries the merge.
 */
export const persistMergedProgress = async (
  userId: string,
  citySlug: string,
  incoming: ProgressPayload,
  { maxAttempts = 3 }: { maxAttempts?: number } = {},
): Promise<PersistedProgress> => {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await runMergeUpsert(userId, citySlug, incoming)
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error
      }
      lastError = error
    }
  }
  throw lastError
}
