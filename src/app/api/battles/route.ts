import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { createBattleInviteToken, createBattleSlug, getBattleSnapshotBySlug } from '@/lib/battles'
import { findRankedCity } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'
import { RANKED_RULESETS, parseRankedRuleset, toPrismaRankedRuleset } from '@/lib/ranked'

const battleSchema = z.object({
  citySlug: z.string().trim().min(1),
  ruleset: z.enum(RANKED_RULESETS).optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const battles = await prisma.battle.findMany({
    where: {
      OR: [{ creatorId: user.id }, { opponentId: user.id }],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    battles: battles.map((battle) => ({
      id: battle.id,
      slug: battle.slug,
      citySlug: battle.citySlug,
      cityPath: battle.cityPath,
      status: battle.status,
      ruleset: battle.ruleset.toLowerCase().replace(/_/g, '-'),
      createdAt: battle.createdAt.toISOString(),
      completedAt: battle.completedAt?.toISOString() ?? null,
      winnerUserId: battle.winnerUserId,
    })),
  })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = battleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid battle payload.' }, { status: 400 })
  }

  const city = findRankedCity(parsed.data.citySlug)
  if (!city) {
    return NextResponse.json({ error: 'Unknown city.' }, { status: 404 })
  }

  const ruleset = parseRankedRuleset(parsed.data.ruleset)
  const seed = createHash('sha256')
    .update(`${user.id}:${city.slug}:${ruleset}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16)
  const slug = createBattleSlug(city.slug)
  const inviteToken = createBattleInviteToken(seed)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const battle = await prisma.battle.create({
    data: {
      slug,
      inviteToken,
      creatorId: user.id,
      citySlug: city.slug,
      cityPath: city.path,
      ruleset: toPrismaRankedRuleset(ruleset),
      seed,
      expiresAt,
      status: 'OPEN',
    },
  })

  const snapshot = await getBattleSnapshotBySlug(battle.slug)
  return NextResponse.json({ battle: snapshot })
}
