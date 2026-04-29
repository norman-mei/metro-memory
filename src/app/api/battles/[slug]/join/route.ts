import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getBattleSnapshotBySlug } from '@/lib/battles'
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
  const battle = await prisma.battle.findUnique({
    where: { slug },
  })

  if (!battle) {
    return NextResponse.json({ error: 'Battle not found.' }, { status: 404 })
  }
  if (battle.creatorId === user.id) {
    const snapshot = await getBattleSnapshotBySlug(slug)
    return NextResponse.json({ battle: snapshot })
  }
  if (battle.opponentId && battle.opponentId !== user.id) {
    return NextResponse.json({ error: 'Battle invite already claimed.' }, { status: 409 })
  }
  if (battle.status === 'COMPLETED' || battle.status === 'EXPIRED' || battle.status === 'CANCELED') {
    return NextResponse.json({ error: 'Battle is no longer joinable.' }, { status: 409 })
  }

  await prisma.battle.update({
    where: { id: battle.id },
    data: {
      opponentId: user.id,
      joinedAt: new Date(),
      status: 'READY',
    },
  })

  const snapshot = await getBattleSnapshotBySlug(slug)
  return NextResponse.json({ battle: snapshot })
}
