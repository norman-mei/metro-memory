import { NextRequest, NextResponse } from 'next/server'

import { getChallengeLeaderboardRows, buildPublicDisplayName } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { slug } = await params

  const challenge = await prisma.challengeDefinition.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  })

  if (!challenge || !challenge.active) {
    return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 })
  }

  const leaderboard = await getChallengeLeaderboardRows({
    challengeId: challenge.id,
    limit: 25,
  })

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      citySlug: challenge.citySlug,
      cityPath: challenge.cityPath,
      ruleset: challenge.ruleset.toLowerCase().replace(/_/g, '-'),
      seed: challenge.seed,
      createdAt: challenge.createdAt.toISOString(),
      creatorName: challenge.creator ? buildPublicDisplayName(challenge.creator) : null,
    },
    leaderboard,
  })
}
