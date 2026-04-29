import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { ensureCurrentSeason, resolvePlaylistRunRuleset } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'
import {
  RANKED_RULESETS,
  RANKED_SOURCES,
  parseRankedRuleset,
  parseRankedRunSource,
  toPrismaRankedRuleset,
  toPrismaRankedRunSource,
} from '@/lib/ranked'
import { findRankedCity } from '@/lib/rankedServer'

const startSchema = z.object({
  citySlug: z.string().trim().min(1),
  cityPath: z.string().trim().min(1),
  ruleset: z.enum(RANKED_RULESETS).optional(),
  source: z.enum(RANKED_SOURCES).optional(),
  seed: z.string().trim().min(1).max(64).optional(),
  battleId: z.string().trim().min(1).optional(),
  playlistRunId: z.string().trim().min(1).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = startSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid run payload.' }, { status: 400 })
  }

  const source = parseRankedRunSource(parsed.data.source)
  let citySlug = parsed.data.citySlug
  let cityPath = parsed.data.cityPath
  let ruleset = parseRankedRuleset(parsed.data.ruleset)
  let seed =
    parsed.data.seed ??
    createHash('sha256')
      .update(`${user.id}:${citySlug}:${ruleset}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16)
  let battleId = parsed.data.battleId
  let playlistRunId = parsed.data.playlistRunId
  const season = await ensureCurrentSeason()

  if (!findRankedCity(citySlug)) {
    return NextResponse.json({ error: 'Unknown city.' }, { status: 404 })
  }

  if (source === 'battle' && battleId) {
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
    })
    if (!battle) {
      return NextResponse.json({ error: 'Battle not found.' }, { status: 404 })
    }
    if (battle.status === 'COMPLETED' || battle.status === 'EXPIRED' || battle.status === 'CANCELED') {
      return NextResponse.json({ error: 'Battle is no longer active.' }, { status: 409 })
    }
    if (battle.creatorId !== user.id && battle.opponentId !== user.id) {
      return NextResponse.json({ error: 'Join the battle from its invite page first.' }, { status: 403 })
    }
    citySlug = battle.citySlug
    cityPath = battle.cityPath
    ruleset = parseRankedRuleset(battle.ruleset.toLowerCase().replace(/_/g, '-'))
    seed = battle.seed
    const existingBattleSession = await prisma.runSession.findFirst({
      where: {
        battleId: battle.id,
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
    })
    if (existingBattleSession) {
      return NextResponse.json({
        session: {
          id: existingBattleSession.id,
          citySlug: existingBattleSession.citySlug,
          cityPath: existingBattleSession.cityPath,
          ruleset,
          source,
          seed: existingBattleSession.seed,
          rankedEligible: existingBattleSession.rankedEligible,
          dailyChallengeId: existingBattleSession.dailyChallengeId,
          challengeId: existingBattleSession.challengeId,
          battleId: existingBattleSession.battleId,
          playlistRunId: existingBattleSession.playlistRunId,
          seasonId: existingBattleSession.seasonId,
        },
      })
    }

    if (!battle.opponentId && battle.creatorId !== user.id) {
      return NextResponse.json({ error: 'Battle opponent has not joined yet.' }, { status: 409 })
    }
  }

  if (playlistRunId) {
    const playlistRun = await prisma.playlistRun.findUnique({
      where: { id: playlistRunId },
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

    if (!playlistRun || playlistRun.userId !== user.id) {
      return NextResponse.json({ error: 'Playlist run not found.' }, { status: 404 })
    }
    if (playlistRun.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Playlist run is already complete.' }, { status: 409 })
    }
    const item = playlistRun.playlist.items[playlistRun.currentIndex]
    if (!item) {
      return NextResponse.json({ error: 'Playlist run has no remaining cities.' }, { status: 409 })
    }
    citySlug = item.citySlug
    cityPath = item.cityPath
    const playlistRuleset = resolvePlaylistRunRuleset({
      mode: playlistRun.mode.toLowerCase().replace(/_/g, '-') as any,
      ruleset:
        playlistRun.ruleset != null
          ? parseRankedRuleset(playlistRun.ruleset.toLowerCase().replace(/_/g, '-'))
          : ruleset,
    })
    ruleset = playlistRuleset ?? ruleset
  }

  const session = await prisma.runSession.create({
    data: {
      userId: user.id,
      citySlug,
      cityPath,
      ruleset: toPrismaRankedRuleset(ruleset),
      sourceType: toPrismaRankedRunSource(source),
      seed,
      seasonId: season.id,
      ...(battleId ? { battleId } : {}),
      ...(playlistRunId ? { playlistRunId } : {}),
    },
  })

  if (battleId) {
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      select: {
        creatorId: true,
      },
    })

    if (battle) {
      await prisma.battle.update({
        where: { id: battleId },
        data: {
          status: 'ACTIVE',
          ...(battle.creatorId === user.id ? { creatorRunId: session.id } : { opponentRunId: session.id }),
        },
      })
    }
  }

  return NextResponse.json({
    session: {
      id: session.id,
      citySlug: session.citySlug,
      cityPath: session.cityPath,
      ruleset,
      source,
      seed: session.seed,
      rankedEligible: session.rankedEligible,
      dailyChallengeId: session.dailyChallengeId,
      challengeId: session.challengeId,
      battleId: session.battleId,
      playlistRunId: session.playlistRunId,
      seasonId: session.seasonId,
    },
  })
}
