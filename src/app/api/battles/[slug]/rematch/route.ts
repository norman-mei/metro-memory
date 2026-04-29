import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

import { getCurrentUser } from '@/lib/auth'
import { createBattleInviteToken, createBattleSlug, getBattleSnapshotBySlug } from '@/lib/battles'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    slug: string
  }>
}

export async function POST(_: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const sourceBattle = await prisma.battle.findUnique({
    where: { slug },
  })
  if (!sourceBattle) {
    return NextResponse.json({ error: 'Battle not found.' }, { status: 404 })
  }
  if (sourceBattle.creatorId !== user.id && sourceBattle.opponentId !== user.id) {
    return NextResponse.json({ error: 'Only battle participants can request a rematch.' }, { status: 403 })
  }

  const seed = createHash('sha256')
    .update(`${sourceBattle.id}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16)
  const rematch = await prisma.battle.create({
    data: {
      slug: createBattleSlug(sourceBattle.citySlug),
      inviteToken: createBattleInviteToken(seed),
      citySlug: sourceBattle.citySlug,
      cityPath: sourceBattle.cityPath,
      ruleset: sourceBattle.ruleset,
      seed,
      status:
        sourceBattle.opponentId && sourceBattle.opponentId !== user.id
          ? 'READY'
          : 'OPEN',
      creatorId: user.id,
      opponentId:
        sourceBattle.opponentId && sourceBattle.opponentId !== user.id
          ? sourceBattle.opponentId
          : null,
      joinedAt:
        sourceBattle.opponentId && sourceBattle.opponentId !== user.id
          ? new Date()
          : null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const snapshot = await getBattleSnapshotBySlug(rematch.slug)
  return NextResponse.json({ battle: snapshot })
}
