import { NextResponse } from 'next/server'

import { formatRankedRuleset } from '@/lib/ranked'
import { ensureDailyChallenge, getChallengeLeaderboardRows } from '@/lib/rankedServer'

export async function GET() {
  const daily = await ensureDailyChallenge()
  const leaderboard = await getChallengeLeaderboardRows({
    dailyChallengeId: daily.id,
    limit: 25,
  })

  return NextResponse.json({
    daily: {
      id: daily.id,
      dateKey: daily.dateKey,
      citySlug: daily.citySlug,
      cityPath: daily.cityPath,
      ruleset: daily.ruleset.toLowerCase().replace(/_/g, '-'),
      rulesetLabel: formatRankedRuleset(
        daily.ruleset.toLowerCase().replace(/_/g, '-') as Parameters<typeof formatRankedRuleset>[0],
      ),
      seed: daily.seed,
    },
    leaderboard,
  })
}
