import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  RANKED_RULESETS,
  createChallengeSlug,
  parseRankedRuleset,
  toPrismaRankedRuleset,
} from '@/lib/ranked'
import { findRankedCity, buildPublicDisplayName } from '@/lib/rankedServer'

const challengeSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional(),
  citySlug: z.string().trim().min(1),
  ruleset: z.enum(RANKED_RULESETS).optional(),
  seed: z.string().trim().min(1).max(64).optional(),
})

export async function GET() {
  const challenges = await prisma.challengeDefinition.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      creator: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json({
    challenges: challenges.map((challenge) => ({
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
    })),
  })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = challengeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid challenge payload.' }, { status: 400 })
  }

  const city = findRankedCity(parsed.data.citySlug)
  if (!city) {
    return NextResponse.json({ error: 'Unknown city.' }, { status: 404 })
  }

  const ruleset = parseRankedRuleset(parsed.data.ruleset)
  const baseSlug = createChallengeSlug(parsed.data.title)
  const seed =
    parsed.data.seed ??
    createHash('sha256')
      .update(`${parsed.data.title}:${city.slug}:${ruleset}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16)

  let slug = baseSlug
  let suffix = 2
  while (await prisma.challengeDefinition.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const challenge = await prisma.challengeDefinition.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      citySlug: city.slug,
      cityPath: city.path,
      ruleset: toPrismaRankedRuleset(ruleset),
      seed,
      creatorId: user.id,
    },
  })

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      citySlug: challenge.citySlug,
      cityPath: challenge.cityPath,
      ruleset,
      seed: challenge.seed,
    },
  })
}
