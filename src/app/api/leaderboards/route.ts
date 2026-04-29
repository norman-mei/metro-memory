import { NextRequest, NextResponse } from 'next/server'

import { parseRankedRuleset } from '@/lib/ranked'
import { ensureDailyChallenge, getChallengeLeaderboardRows } from '@/lib/rankedServer'

export async function GET(request: NextRequest) {
  const citySlug = request.nextUrl.searchParams.get('citySlug')?.trim() || undefined
  const rulesetParam = request.nextUrl.searchParams.get('ruleset')
  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '25')
  const scope = request.nextUrl.searchParams.get('scope') || 'city'
  const ruleset = rulesetParam ? parseRankedRuleset(rulesetParam) : undefined
  const limit = Number.isFinite(limitParam) ? limitParam : 25

  if (scope === 'daily') {
    const daily = await ensureDailyChallenge()
    const leaderboard = await getChallengeLeaderboardRows({
      dailyChallengeId: daily.id,
      limit,
    })
    return NextResponse.json({
      scope,
      leaderboard,
      daily: {
        id: daily.id,
        dateKey: daily.dateKey,
        citySlug: daily.citySlug,
        cityPath: daily.cityPath,
      },
    })
  }

  const leaderboard = await getChallengeLeaderboardRows({
    citySlug,
    ruleset,
    limit,
  })

  return NextResponse.json({
    scope,
    citySlug,
    ruleset: ruleset ?? null,
    leaderboard,
  })
}
