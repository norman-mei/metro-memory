import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
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

  const citySlug = parsed.data.citySlug
  const cityPath = parsed.data.cityPath
  const ruleset = parseRankedRuleset(parsed.data.ruleset)
  const source = parseRankedRunSource(parsed.data.source)
  const seed =
    parsed.data.seed ??
    createHash('sha256')
      .update(`${user.id}:${citySlug}:${ruleset}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16)

  if (!findRankedCity(citySlug)) {
    return NextResponse.json({ error: 'Unknown city.' }, { status: 404 })
  }

  const session = await prisma.runSession.create({
    data: {
      userId: user.id,
      citySlug,
      cityPath,
      ruleset: toPrismaRankedRuleset(ruleset),
      sourceType: toPrismaRankedRunSource(source),
      seed,
    },
  })

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
      battleId: null,
      playlistRunId: null,
      seasonId: null,
    },
  })
}
