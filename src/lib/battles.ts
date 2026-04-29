import { createHash } from 'node:crypto'

import { prisma } from '@/lib/prisma'
import { formatDuration, formatPercent, fromPrismaRankedRuleset } from '@/lib/ranked'
import { resolveBattleOutcome } from '@/lib/progression'
import { buildPublicDisplayName } from '@/lib/rankedServer'

export function createBattleSlug(citySlug: string) {
  const stamp = Date.now().toString(36)
  return `${citySlug}-battle-${stamp}`
}

export function createBattleInviteToken(seed: string) {
  return createHash('sha256').update(`${seed}:${Date.now()}`).digest('hex').slice(0, 24)
}

export async function getBattleSnapshotBySlug(slug: string) {
  const battle = await prisma.battle.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      opponent: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      runSessions: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!battle) {
    return null
  }

  if (battle.status !== 'COMPLETED' && battle.status !== 'CANCELED' && battle.status !== 'EXPIRED') {
    await resolveBattleOutcome(battle.id)
  }

  const refreshed = await prisma.battle.findUnique({
    where: { id: battle.id },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      opponent: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      runSessions: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!refreshed) {
    return null
  }

  const creatorSession =
    refreshed.runSessions.find((session) => session.id === refreshed.creatorRunId) ??
    refreshed.runSessions.find((session) => session.userId === refreshed.creatorId) ??
    null
  const opponentSession =
    refreshed.runSessions.find((session) => session.id === refreshed.opponentRunId) ??
    refreshed.runSessions.find((session) => session.userId === refreshed.opponentId) ??
    null

  const serializeSession = (session: typeof creatorSession) =>
    session
      ? {
          id: session.id,
          userId: session.userId,
          playerName: buildPublicDisplayName(session.user),
          status: session.status,
          rankedEligible: session.rankedEligible,
          disqualificationReason: session.disqualificationReason,
          completionMs: session.completionMs,
          completionLabel: formatDuration(session.completionMs),
          accuracy: formatPercent(
            session.correctGuessCount + session.wrongGuessCount + session.repeatedGuessCount > 0
              ? session.correctGuessCount /
                  (session.correctGuessCount + session.wrongGuessCount + session.repeatedGuessCount)
              : 0,
          ),
          hintCount: session.hintCount,
          endedAt: session.endedAt?.toISOString() ?? null,
        }
      : null

  return {
    id: refreshed.id,
    slug: refreshed.slug,
    inviteToken: refreshed.inviteToken,
    status: refreshed.status,
    citySlug: refreshed.citySlug,
    cityPath: refreshed.cityPath,
    ruleset: fromPrismaRankedRuleset(refreshed.ruleset),
    seed: refreshed.seed,
    createdAt: refreshed.createdAt.toISOString(),
    joinedAt: refreshed.joinedAt?.toISOString() ?? null,
    expiresAt: refreshed.expiresAt?.toISOString() ?? null,
    completedAt: refreshed.completedAt?.toISOString() ?? null,
    winnerUserId: refreshed.winnerUserId,
    winnerReason: refreshed.winnerReason,
    creator: {
      id: refreshed.creator.id,
      name: buildPublicDisplayName(refreshed.creator),
    },
    opponent: refreshed.opponent
      ? {
          id: refreshed.opponent.id,
          name: buildPublicDisplayName(refreshed.opponent),
        }
      : null,
    creatorSession: serializeSession(creatorSession),
    opponentSession: serializeSession(opponentSession),
  }
}
