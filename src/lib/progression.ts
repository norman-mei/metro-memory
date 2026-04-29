import { prisma } from '@/lib/prisma'
import { STATION_TOTALS } from '@/lib/stationTotals'
import { ensureCurrentSeason, ensureLiveOpsCatalog } from '@/lib/liveOps'
import { fromPrismaRankedRuleset } from '@/lib/ranked'
import { findRankedCity, getRankedCities } from '@/lib/rankedServer'

const RANKED_COMPLETION_TARGET = 0.9999
const BATTLE_WIN_XP = 180
const CAMPAIGN_COMPLETE_XP = 220
const PLAYLIST_COMPLETE_XP = 160

const RULESET_MULTIPLIERS: Record<string, number> = {
  CLASSIC: 1,
  NO_LINE_COLORS: 1.12,
  STRICT_SPELLING: 1.18,
  ONE_LIFE: 1.24,
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDayWindow(date: Date) {
  const key = getDateKey(date)
  const start = new Date(`${key}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end, key }
}

function diffUtcDays(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00.000Z`)
  const to = new Date(`${toKey}T00:00:00.000Z`)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function uniquePush(items: string[], next: string) {
  return items.includes(next) ? items : [...items, next]
}

function getRunAccuracy(run: {
  correctGuessCount: number
  wrongGuessCount: number
  repeatedGuessCount: number
}) {
  const total =
    run.correctGuessCount + run.wrongGuessCount + run.repeatedGuessCount
  if (total <= 0) {
    return 0
  }
  return run.correctGuessCount / total
}

function getBaseXpForCity(citySlug: string) {
  const stationTotal = STATION_TOTALS[citySlug] ?? 0
  if (stationTotal >= 900) return 380
  if (stationTotal >= 500) return 320
  if (stationTotal >= 250) return 260
  if (stationTotal >= 120) return 210
  if (stationTotal >= 50) return 160
  if (stationTotal >= 20) return 120
  return 90
}

export function getLevelForXp(xp: number) {
  let level = 1
  let spent = 0
  let increment = 200

  while (xp >= spent + increment) {
    spent += increment
    level += 1
    increment = 200 + (level - 1) * 120
  }

  return {
    level,
    xpIntoLevel: Math.max(0, xp - spent),
    xpForNextLevel: increment,
    levelStartXp: spent,
    nextLevelXp: spent + increment,
  }
}

async function ensurePlayerState(tx: any, userId: string) {
  await Promise.all([
    tx.playerCareerState.upsert({
      where: { userId },
      update: {},
      create: { userId },
    }),
    tx.playerStreakState.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    }),
  ])
}

async function grantLicense(tx: any, userId: string, key: string, title: string, description: string) {
  await tx.playerLicense.upsert({
    where: { userId_key: { userId, key } },
    update: {},
    create: {
      userId,
      key,
      title,
      description,
    },
  })
}

async function grantBadge(tx: any, userId: string, key: string, title: string, description: string, seasonId?: string | null) {
  await tx.playerBadge.upsert({
    where: { userId_key: { userId, key } },
    update: {},
    create: {
      userId,
      seasonId: seasonId ?? null,
      key,
      title,
      description,
    },
  })
}

async function awardXp(tx: any, params: {
  userId: string
  amount: number
  sourceKey: string
  summary: string
  runSessionId?: string | null
  seasonId?: string | null
  metadataJson?: Record<string, unknown> | null
}) {
  if (params.amount <= 0) {
    const existingCareer = await tx.playerCareerState.findUnique({
      where: { userId: params.userId },
    })
    return existingCareer
      ? {
          lifetimeXp: existingCareer.lifetimeXp,
          level: existingCareer.level,
        }
      : { lifetimeXp: 0, level: 1 }
  }

  await tx.xpLedgerEntry.create({
    data: {
      userId: params.userId,
      runSessionId: params.runSessionId ?? null,
      seasonId: params.seasonId ?? null,
      sourceKey: params.sourceKey,
      amount: params.amount,
      summary: params.summary,
      metadataJson: params.metadataJson ?? null,
    },
  })

  const current = await tx.playerCareerState.findUnique({
    where: { userId: params.userId },
  })
  const lifetimeXp = (current?.lifetimeXp ?? 0) + params.amount
  const level = getLevelForXp(lifetimeXp).level

  await tx.playerCareerState.upsert({
    where: { userId: params.userId },
    update: {
      lifetimeXp,
      level,
    },
    create: {
      userId: params.userId,
      lifetimeXp,
      level,
    },
  })

  if (params.seasonId) {
    await tx.seasonProgress.upsert({
      where: {
        userId_seasonId: {
          userId: params.userId,
          seasonId: params.seasonId,
        },
      },
      update: {
        seasonXp: {
          increment: params.amount,
        },
      },
      create: {
        userId: params.userId,
        seasonId: params.seasonId,
        seasonXp: params.amount,
        completedEventSlugs: [],
      },
    })
  }

  return { lifetimeXp, level }
}

async function updateStreak(tx: any, userId: string, dateKey: string) {
  const state = await tx.playerStreakState.findUnique({
    where: { userId },
  })

  if (state?.lastCountedDate === dateKey) {
    return { counted: false, currentStreak: state.currentStreak, bestStreak: state.bestStreak }
  }

  const gap = state?.lastCountedDate ? diffUtcDays(state.lastCountedDate, dateKey) : null
  let currentStreak = 1
  let freezeTokens = state?.freezeTokens ?? 0

  if (gap === 1) {
    currentStreak = (state?.currentStreak ?? 0) + 1
  } else if (gap === 2 && freezeTokens > 0) {
    freezeTokens -= 1
    currentStreak = (state?.currentStreak ?? 0) + 1
  }

  const priorStreak = state?.currentStreak ?? 0
  if (currentStreak > 0 && currentStreak % 14 === 0 && currentStreak !== priorStreak) {
    freezeTokens += 1
  }

  const bestStreak = Math.max(state?.bestStreak ?? 0, currentStreak)

  await tx.playerStreakState.upsert({
    where: { userId },
    update: {
      currentStreak,
      bestStreak,
      lastCountedDate: dateKey,
      freezeTokens,
    },
    create: {
      userId,
      currentStreak,
      bestStreak,
      lastCountedDate: dateKey,
      freezeTokens,
    },
  })

  if (currentStreak >= 7) {
    await grantBadge(
      tx,
      userId,
      `streak-${currentStreak >= 30 ? '30' : '7'}`,
      currentStreak >= 30 ? 'Monthlong Streak' : 'Weeklong Streak',
      currentStreak >= 30 ? 'Hold a valid ranked streak for 30 days.' : 'Hold a valid ranked streak for 7 days.',
    )
  }

  return { counted: true, currentStreak, bestStreak }
}

async function syncCampaignProgress(tx: any, run: any) {
  const campaigns = await tx.campaign.findMany({
    where: {
      active: true,
      cities: {
        some: {
          citySlug: run.citySlug,
        },
      },
    },
    include: {
      cities: true,
    },
  })

  const completedCampaigns: string[] = []

  for (const campaign of campaigns) {
    const existing = await tx.campaignProgress.findUnique({
      where: {
        userId_campaignId: {
          userId: run.userId,
          campaignId: campaign.id,
        },
      },
    })
    const completedCitySlugs = normalizeStringArray(existing?.completedCitySlugs)
    if (completedCitySlugs.includes(run.citySlug)) {
      continue
    }
    const nextCitySlugs = uniquePush(completedCitySlugs, run.citySlug)
    const completed = nextCitySlugs.length >= campaign.cities.length
    await tx.campaignProgress.upsert({
      where: {
        userId_campaignId: {
          userId: run.userId,
          campaignId: campaign.id,
        },
      },
      update: {
        completedCitySlugs: nextCitySlugs,
        progressCount: nextCitySlugs.length,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: run.userId,
        campaignId: campaign.id,
        completedCitySlugs: nextCitySlugs,
        progressCount: nextCitySlugs.length,
        completedAt: completed ? new Date() : null,
      },
    })

    if (completed) {
      completedCampaigns.push(campaign.slug)
      await awardXp(tx, {
        userId: run.userId,
        amount: CAMPAIGN_COMPLETE_XP,
        sourceKey: `campaign-complete:${campaign.slug}`,
        summary: `Completed campaign ${campaign.title}`,
        runSessionId: run.id,
        seasonId: run.seasonId ?? null,
      })
      await grantBadge(
        tx,
        run.userId,
        `campaign-${campaign.slug}`,
        `${campaign.title} Complete`,
        `Finish every city in ${campaign.title}.`,
        run.seasonId ?? null,
      )
    }
  }

  return completedCampaigns
}

async function syncPlaylistRun(tx: any, run: any) {
  if (!run.playlistRunId) {
    return null
  }

  const playlistRun = await tx.playlistRun.findUnique({
    where: { id: run.playlistRunId },
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

  if (!playlistRun || playlistRun.status !== 'ACTIVE') {
    return playlistRun
  }

  const currentItem = playlistRun.playlist.items[playlistRun.currentIndex]
  if (!currentItem || currentItem.citySlug !== run.citySlug) {
    return playlistRun
  }

  const nextCompletedLegs = playlistRun.completedLegs + 1
  const totalLegs = playlistRun.totalLegs || playlistRun.playlist.items.length
  const aggregateAccuracy =
    ((playlistRun.aggregateAccuracy ?? 0) * playlistRun.completedLegs + getRunAccuracy(run)) /
    Math.max(1, nextCompletedLegs)
  const completed = nextCompletedLegs >= totalLegs

  const updated = await tx.playlistRun.update({
    where: { id: playlistRun.id },
    data: {
      completedLegs: nextCompletedLegs,
      currentIndex: Math.min(totalLegs, playlistRun.currentIndex + 1),
      aggregateCompletionMs: (playlistRun.aggregateCompletionMs ?? 0) + (run.completionMs ?? 0),
      aggregateAccuracy,
      lastCompletedCitySlug: run.citySlug,
      status: completed ? 'COMPLETED' : 'ACTIVE',
      completedAt: completed ? new Date() : null,
    },
  })

  if (completed) {
    await awardXp(tx, {
      userId: run.userId,
      amount: PLAYLIST_COMPLETE_XP,
      sourceKey: `playlist-complete:${playlistRun.id}`,
      summary: `Completed playlist ${playlistRun.playlist.name}`,
      runSessionId: run.id,
      seasonId: run.seasonId ?? null,
    })
    await grantBadge(
      tx,
      run.userId,
      `playlist-${playlistRun.playlistId}`,
      `${playlistRun.playlist.name} Finished`,
      'Complete every leg of a saved playlist run.',
      run.seasonId ?? null,
    )
  }

  return updated
}

async function syncSeasonEvents(tx: any, run: any) {
  if (!run.seasonId) {
    return []
  }

  const [season, progress] = await Promise.all([
    tx.season.findUnique({
      where: { id: run.seasonId },
      include: { events: true },
    }),
    tx.seasonProgress.upsert({
      where: {
        userId_seasonId: {
          userId: run.userId,
          seasonId: run.seasonId,
        },
      },
      update: {},
      create: {
        userId: run.userId,
        seasonId: run.seasonId,
        completedEventSlugs: [],
      },
    }),
  ])

  if (!season) {
    return []
  }

  let completedEventSlugs = normalizeStringArray(progress.completedEventSlugs)
  const newlyCompleted: string[] = []

  for (const event of season.events) {
    if (completedEventSlugs.includes(event.slug)) {
      continue
    }

    let count = 0

    if (event.eventType === 'DAILY_CLEAR') {
      count = await tx.runSession.count({
        where: {
          userId: run.userId,
          seasonId: run.seasonId,
          status: 'COMPLETED',
          rankedEligible: true,
          completionPercent: { gte: RANKED_COMPLETION_TARGET },
          sourceType: 'DAILY',
        },
      })
    } else if (event.eventType === 'CITY_CLEAR' && event.citySlug) {
      count = await tx.runSession.count({
        where: {
          userId: run.userId,
          seasonId: run.seasonId,
          status: 'COMPLETED',
          rankedEligible: true,
          completionPercent: { gte: RANKED_COMPLETION_TARGET },
          citySlug: event.citySlug,
          ...(event.ruleset ? { ruleset: event.ruleset } : {}),
        },
      })
    } else if (event.eventType === 'RULESET_CLEAR' && event.ruleset) {
      count = await tx.runSession.count({
        where: {
          userId: run.userId,
          seasonId: run.seasonId,
          status: 'COMPLETED',
          rankedEligible: true,
          completionPercent: { gte: RANKED_COMPLETION_TARGET },
          ruleset: event.ruleset,
        },
      })
    } else if (event.eventType === 'BATTLE_WIN') {
      count = progress.battleWinCount ?? 0
    }

    if (count >= event.targetCount) {
      completedEventSlugs = uniquePush(completedEventSlugs, event.slug)
      newlyCompleted.push(event.slug)
      await awardXp(tx, {
        userId: run.userId,
        amount: event.rewardXp,
        sourceKey: `season-event:${event.slug}`,
        summary: `Completed season event ${event.title}`,
        runSessionId: run.id,
        seasonId: run.seasonId,
      })
    }
  }

  if (newlyCompleted.length > 0) {
    await tx.seasonProgress.update({
      where: {
        userId_seasonId: {
          userId: run.userId,
          seasonId: run.seasonId,
        },
      },
      data: {
        completedEventSlugs,
        completedEventCount: completedEventSlugs.length,
        ...(run.sourceType === 'DAILY'
          ? { dailyParticipationCount: { increment: 1 } }
          : {}),
      },
    })
  } else if (run.sourceType === 'DAILY') {
    await tx.seasonProgress.update({
      where: {
        userId_seasonId: {
          userId: run.userId,
          seasonId: run.seasonId,
        },
      },
      data: {
        dailyParticipationCount: { increment: 1 },
      },
    })
  }

  if (completedEventSlugs.length >= season.events.length && season.events.length > 0) {
    await grantBadge(
      tx,
      run.userId,
      `season-${season.slug}`,
      `${season.title} Cleared`,
      `Complete every event in ${season.title}.`,
      season.id,
    )
  }

  return completedEventSlugs
}

async function grantRunLicenses(tx: any, run: any) {
  const city = findRankedCity(run.citySlug)
  const rulesetId = fromPrismaRankedRuleset(run.ruleset)

  if (city) {
    const continentCitySlugs = getRankedCities()
      .filter((entry) => entry.continent === city.continent)
      .map((entry) => entry.slug)
    const continentRuns = await tx.runSession.count({
      where: {
        userId: run.userId,
        status: 'COMPLETED',
        rankedEligible: true,
        completionPercent: { gte: RANKED_COMPLETION_TARGET },
        citySlug: {
          in: continentCitySlugs,
        },
      },
    })

    if (continentRuns >= 3) {
      await grantLicense(
        tx,
        run.userId,
        `continent-${city.continent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        `${city.continent} License`,
        `Earned for posting multiple valid ranked clears in ${city.continent}.`,
      )
    }
  }

  const rulesetRuns = await tx.runSession.count({
    where: {
      userId: run.userId,
      status: 'COMPLETED',
      rankedEligible: true,
      completionPercent: { gte: RANKED_COMPLETION_TARGET },
      ruleset: run.ruleset,
    },
  })

  if (rulesetRuns >= 3) {
    await grantLicense(
      tx,
      run.userId,
      `ruleset-${rulesetId}`,
      `${rulesetId.replace(/(^|-)([a-z])/g, (_, p1, p2) => `${p1}${p2.toUpperCase()}`)} License`,
      `Earned by clearing three valid ranked runs in ${rulesetId}.`,
    )
  }

  if ((STATION_TOTALS[run.citySlug] ?? 0) >= 250) {
    await grantLicense(
      tx,
      run.userId,
      'large-system',
      'Large System License',
      'Earned by clearing a city with at least 250 stations in ranked play.',
    )
  }

  if (run.battleId) {
    await grantLicense(
      tx,
      run.userId,
      'battle-participant',
      'Battle Participant',
      'Earned by entering an async battle.',
    )
  }
}

function isValidBattleResult(session: any) {
  return Boolean(
    session &&
      session.status === 'COMPLETED' &&
      session.rankedEligible &&
      session.completionPercent >= RANKED_COMPLETION_TARGET &&
      session.completionMs,
  )
}

function compareBattleSessions(a: any, b: any) {
  const aMs = a.completionMs ?? Number.MAX_SAFE_INTEGER
  const bMs = b.completionMs ?? Number.MAX_SAFE_INTEGER
  if (aMs !== bMs) {
    return aMs - bMs
  }
  const accuracyDiff = getRunAccuracy(b) - getRunAccuracy(a)
  if (accuracyDiff !== 0) {
    return accuracyDiff
  }
  if (a.hintCount !== b.hintCount) {
    return a.hintCount - b.hintCount
  }
  return new Date(a.endedAt ?? a.updatedAt).getTime() - new Date(b.endedAt ?? b.updatedAt).getTime()
}

async function rewardBattleWin(tx: any, battle: any, winnerUserId: string, seasonId?: string | null) {
  await awardXp(tx, {
    userId: winnerUserId,
    amount: BATTLE_WIN_XP,
    sourceKey: `battle-win:${battle.id}`,
    summary: `Won battle ${battle.slug}`,
    seasonId: seasonId ?? null,
  })

  if (seasonId) {
    const progress = await tx.seasonProgress.upsert({
      where: {
        userId_seasonId: {
          userId: winnerUserId,
          seasonId,
        },
      },
      update: {
        battleWinCount: {
          increment: 1,
        },
      },
      create: {
        userId: winnerUserId,
        seasonId,
        battleWinCount: 1,
        completedEventSlugs: [],
      },
    })

    const season = await tx.season.findUnique({
      where: { id: seasonId },
      include: { events: true },
    })

    const completedEventSlugs = normalizeStringArray(progress.completedEventSlugs)
    const battleEvent = season?.events.find((event: any) => event.eventType === 'BATTLE_WIN')
    if (
      battleEvent &&
      !completedEventSlugs.includes(battleEvent.slug) &&
      (progress.battleWinCount ?? 0) + 1 >= battleEvent.targetCount
    ) {
      await awardXp(tx, {
        userId: winnerUserId,
        amount: battleEvent.rewardXp,
        sourceKey: `season-event:${battleEvent.slug}`,
        summary: `Completed season event ${battleEvent.title}`,
        seasonId,
      })
      await tx.seasonProgress.update({
        where: {
          userId_seasonId: {
            userId: winnerUserId,
            seasonId,
          },
        },
        data: {
          completedEventSlugs: uniquePush(completedEventSlugs, battleEvent.slug),
          completedEventCount: completedEventSlugs.length + 1,
        },
      })
    }
  }

  await grantLicense(
    tx,
    winnerUserId,
    'battle-winner',
    'Battle Winner',
    'Earned by winning an async battle.',
  )
}

async function resolveBattleOutcomeTx(tx: any, battleId: string, now = new Date()) {
  const battle = await tx.battle.findUnique({
    where: { id: battleId },
    include: {
      runSessions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!battle) {
    return null
  }

  const expired = Boolean(battle.expiresAt && battle.expiresAt.getTime() <= now.getTime())
  const creatorSession =
    battle.runSessions.find((session: any) => session.id === battle.creatorRunId) ??
    battle.runSessions.find((session: any) => session.userId === battle.creatorId) ??
    null
  const opponentSession =
    battle.runSessions.find((session: any) => session.id === battle.opponentRunId) ??
    battle.runSessions.find((session: any) => session.userId === battle.opponentId) ??
    null

  if (!battle.opponentId) {
    const nextStatus = expired ? 'EXPIRED' : 'OPEN'
    if (nextStatus !== battle.status) {
      return tx.battle.update({
        where: { id: battle.id },
        data: { status: nextStatus },
      })
    }
    return battle
  }

  const creatorFinished = creatorSession?.status === 'COMPLETED'
  const opponentFinished = opponentSession?.status === 'COMPLETED'
  const creatorValid = isValidBattleResult(creatorSession)
  const opponentValid = isValidBattleResult(opponentSession)

  let nextStatus: string = creatorSession || opponentSession ? 'ACTIVE' : 'READY'
  let winnerUserId: string | null = battle.winnerUserId ?? null
  let winnerReason: string | null = battle.winnerReason ?? null

  const shouldResolveByAttempts = creatorFinished && opponentFinished
  const shouldResolveByExpiry = expired && (creatorSession || opponentSession)

  if (shouldResolveByAttempts || shouldResolveByExpiry) {
    if (creatorValid && opponentValid) {
      const winner = compareBattleSessions(creatorSession, opponentSession) <= 0
        ? creatorSession
        : opponentSession
      winnerUserId = winner.userId
      winnerReason = 'FASTEST_VALID_TIME'
      nextStatus = 'COMPLETED'
    } else if (creatorValid !== opponentValid) {
      winnerUserId = creatorValid ? battle.creatorId : battle.opponentId
      winnerReason = expired && !(creatorFinished && opponentFinished) ? 'EXPIRY_DEFAULT' : 'VALID_FINISH'
      nextStatus = 'COMPLETED'
    } else if (expired) {
      winnerUserId = null
      winnerReason = 'NO_CONTEST'
      nextStatus = 'EXPIRED'
    } else {
      winnerUserId = null
      winnerReason = 'NO_CONTEST'
      nextStatus = 'COMPLETED'
    }
  } else if (battle.status === 'OPEN' || battle.status === 'READY') {
    nextStatus = creatorSession || opponentSession ? 'ACTIVE' : 'READY'
  }

  const winnerSession = battle.runSessions.find((session: any) => session.userId === winnerUserId) ?? null
  const winningSeasonId = winnerSession?.seasonId ?? creatorSession?.seasonId ?? opponentSession?.seasonId ?? null

  const updated = await tx.battle.update({
    where: { id: battle.id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === 'COMPLETED' || nextStatus === 'EXPIRED' ? now : null,
      winnerUserId,
      winnerReason,
    },
  })

  if (battle.status !== 'COMPLETED' && winnerUserId && nextStatus === 'COMPLETED') {
    await rewardBattleWin(tx, battle, winnerUserId, winningSeasonId)
  }

  return updated
}

export async function resolveBattleOutcome(battleId: string, now = new Date()) {
  return prisma.$transaction((tx) => resolveBattleOutcomeTx(tx, battleId, now))
}

export async function processCompletedRun(runSessionId: string) {
  await ensureLiveOpsCatalog()

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.runSession.findUnique({
      where: { id: runSessionId },
    })

    if (!run || run.status !== 'COMPLETED') {
      return null
    }

    await ensurePlayerState(tx, run.userId)

    const existingLedger = await tx.xpLedgerEntry.findFirst({
      where: { runSessionId: run.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!run.rankedEligible || run.completionPercent < RANKED_COMPLETION_TARGET) {
      return {
        xpAwarded: run.xpAwarded,
        countedForStreak: run.countedForStreak,
        progressionApplied: Boolean(existingLedger),
        battleId: run.battleId ?? null,
      }
    }

    if (existingLedger) {
      return {
        xpAwarded: run.xpAwarded,
        countedForStreak: run.countedForStreak,
        progressionApplied: true,
        battleId: run.battleId ?? null,
      }
    }

    const { start, end, key } = getDayWindow(run.startedAt)
    const sameDayRepeatCount = await tx.runSession.count({
      where: {
        userId: run.userId,
        citySlug: run.citySlug,
        ruleset: run.ruleset,
        status: 'COMPLETED',
        rankedEligible: true,
        completionPercent: { gte: RANKED_COMPLETION_TARGET },
        startedAt: {
          gte: start,
          lt: end,
        },
        id: { not: run.id },
      },
    })

    const rulesetMultiplier = RULESET_MULTIPLIERS[run.ruleset] ?? 1
    let xpAwarded = Math.round(getBaseXpForCity(run.citySlug) * rulesetMultiplier)
    if (sameDayRepeatCount > 0) {
      xpAwarded = Math.round(xpAwarded * 0.35)
    }
    if (run.sourceType === 'DAILY') {
      xpAwarded += 80
    }
    if (run.challengeId) {
      xpAwarded += 40
    }

    const streak = await updateStreak(tx, run.userId, key)

    const career = await awardXp(tx, {
      userId: run.userId,
      amount: xpAwarded,
      sourceKey: `ranked-clear:${run.id}`,
      summary: `Cleared ${run.citySlug} in ${fromPrismaRankedRuleset(run.ruleset)}`,
      runSessionId: run.id,
      seasonId: run.seasonId ?? null,
      metadataJson: {
        citySlug: run.citySlug,
        ruleset: run.ruleset,
        sourceType: run.sourceType,
        repeatClear: sameDayRepeatCount > 0,
      },
    })

    await tx.runSession.update({
      where: { id: run.id },
      data: {
        xpAwarded,
        countedForStreak: streak.counted,
      },
    })

    await grantRunLicenses(tx, run)
    await syncCampaignProgress(tx, run)
    await syncPlaylistRun(tx, run)
    await syncSeasonEvents(tx, run)

    if (run.battleId) {
      await resolveBattleOutcome(run.battleId)
    }

    return {
      xpAwarded,
      countedForStreak: streak.counted,
      lifetimeXp: career.lifetimeXp,
      level: career.level,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      progressionApplied: true,
      battleId: run.battleId ?? null,
    }
  })

  if (result?.battleId) {
    await resolveBattleOutcome(result.battleId)
  }

  return result
}

export async function advanceCasualPlaylistRun(params: {
  playlistRunId: string
  userId: string
  citySlug: string
  completionMs?: number | null
  accuracy?: number | null
}) {
  return prisma.$transaction(async (tx) => {
    const playlistRun = await tx.playlistRun.findUnique({
      where: { id: params.playlistRunId },
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

    if (!playlistRun || playlistRun.userId !== params.userId || playlistRun.mode !== 'CASUAL') {
      return null
    }

    if (playlistRun.status !== 'ACTIVE') {
      return playlistRun
    }

    const currentItem = playlistRun.playlist.items[playlistRun.currentIndex]
    if (!currentItem || currentItem.citySlug !== params.citySlug) {
      return playlistRun
    }

    const nextCompletedLegs = playlistRun.completedLegs + 1
    const totalLegs = playlistRun.totalLegs || playlistRun.playlist.items.length
    const aggregateAccuracy =
      ((playlistRun.aggregateAccuracy ?? 0) * playlistRun.completedLegs + (params.accuracy ?? 0)) /
      Math.max(1, nextCompletedLegs)
    const completed = nextCompletedLegs >= totalLegs

    return tx.playlistRun.update({
      where: { id: playlistRun.id },
      data: {
        completedLegs: nextCompletedLegs,
        currentIndex: Math.min(totalLegs, playlistRun.currentIndex + 1),
        aggregateCompletionMs: (playlistRun.aggregateCompletionMs ?? 0) + (params.completionMs ?? 0),
        aggregateAccuracy,
        lastCompletedCitySlug: params.citySlug,
        status: completed ? 'COMPLETED' : 'ACTIVE',
        completedAt: completed ? new Date() : null,
      },
    })
  })
}

export async function getProgressionSnapshot(userId: string) {
  await ensureLiveOpsCatalog()
  const [career, streak, season, recentXp, licenses, badges, campaigns, playlists, battles] =
    await Promise.all([
      prisma.playerCareerState.findUnique({ where: { userId } }),
      prisma.playerStreakState.findUnique({ where: { userId } }),
      ensureCurrentSeason(),
      prisma.xpLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.playerLicense.findMany({
        where: { userId },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.playerBadge.findMany({
        where: { userId },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.campaign.findMany({
        where: { active: true },
        include: {
          cities: {
            orderBy: { orderIndex: 'asc' },
          },
          progress: {
            where: { userId },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.playlist.findMany({
        where: { userId },
        include: {
          items: {
            orderBy: { orderIndex: 'asc' },
          },
          runs: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.battle.findMany({
        where: {
          OR: [{ creatorId: userId }, { opponentId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  const seasonProgress = await prisma.seasonProgress.findUnique({
    where: {
      userId_seasonId: {
        userId,
        seasonId: season.id,
      },
    },
  })

  const lifetimeXp = career?.lifetimeXp ?? 0
  const levelState = getLevelForXp(lifetimeXp)

  return {
    career: {
      lifetimeXp,
      level: career?.level ?? 1,
      xpIntoLevel: levelState.xpIntoLevel,
      xpForNextLevel: levelState.xpForNextLevel,
      nextLevelXp: levelState.nextLevelXp,
    },
    streak: {
      current: streak?.currentStreak ?? 0,
      best: streak?.bestStreak ?? 0,
      freezeTokens: streak?.freezeTokens ?? 0,
      lastCountedDate: streak?.lastCountedDate ?? null,
    },
    currentSeason: {
      id: season.id,
      slug: season.slug,
      title: season.title,
      description: season.description,
      themeColor: season.themeColor,
      startDate: season.startDate.toISOString(),
      endDate: season.endDate.toISOString(),
      events: season.events.map((event: any) => ({
        slug: event.slug,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        targetCount: event.targetCount,
        rewardXp: event.rewardXp,
      })),
      progress: {
        seasonXp: seasonProgress?.seasonXp ?? 0,
        dailyParticipationCount: seasonProgress?.dailyParticipationCount ?? 0,
        battleWinCount: seasonProgress?.battleWinCount ?? 0,
        completedEventSlugs: normalizeStringArray(seasonProgress?.completedEventSlugs),
      },
    },
    recentXp: recentXp.map((entry) => ({
      id: entry.id,
      sourceKey: entry.sourceKey,
      summary: entry.summary,
      amount: entry.amount,
      createdAt: entry.createdAt.toISOString(),
    })),
    licenses: licenses.map((entry) => ({
      key: entry.key,
      title: entry.title,
      description: entry.description,
      awardedAt: entry.awardedAt.toISOString(),
    })),
    badges: badges.map((entry) => ({
      key: entry.key,
      title: entry.title,
      description: entry.description,
      awardedAt: entry.awardedAt.toISOString(),
    })),
    campaigns: campaigns.map((campaign) => {
      const progress = campaign.progress[0] ?? null
      const completedCitySlugs = normalizeStringArray(progress?.completedCitySlugs)
      return {
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        themeColor: campaign.themeColor,
        progressCount: progress?.progressCount ?? 0,
        totalCities: campaign.cities.length,
        completedAt: progress?.completedAt?.toISOString() ?? null,
        completedCitySlugs,
        cities: campaign.cities.map((city) => ({
          citySlug: city.citySlug,
          cityPath: city.cityPath,
          orderIndex: city.orderIndex,
        })),
      }
    }),
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      itemCount: playlist.items.length,
      updatedAt: playlist.updatedAt.toISOString(),
      items: playlist.items.map((item) => ({
        citySlug: item.citySlug,
        cityPath: item.cityPath,
        orderIndex: item.orderIndex,
      })),
      runs: playlist.runs.map((run) => ({
        id: run.id,
        mode: run.mode,
        status: run.status,
        completedLegs: run.completedLegs,
        totalLegs: run.totalLegs,
        aggregateCompletionMs: run.aggregateCompletionMs,
        aggregateAccuracy: run.aggregateAccuracy,
        createdAt: run.createdAt.toISOString(),
      })),
    })),
    battles: battles.map((battle) => ({
      id: battle.id,
      slug: battle.slug,
      citySlug: battle.citySlug,
      cityPath: battle.cityPath,
      status: battle.status,
      winnerUserId: battle.winnerUserId,
      createdAt: battle.createdAt.toISOString(),
      completedAt: battle.completedAt?.toISOString() ?? null,
    })),
  }
}

export async function getAnalyticsSnapshot(userId: string) {
  const [runs, battles] = await Promise.all([
    prisma.runSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.battle.findMany({
      where: {
        OR: [{ creatorId: userId }, { opponentId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ])

  const completedRanked = runs.filter(
    (run) =>
      run.status === 'COMPLETED' &&
      run.rankedEligible &&
      run.completionPercent >= RANKED_COMPLETION_TARGET,
  )
  const disqualified = runs.filter((run) => !run.rankedEligible)
  const revealDisqualified = disqualified.filter((run) => run.revealUsed)

  const byCity = new Map<string, { clears: number; bestMs: number | null; accuracyTotal: number }>()
  const byRuleset = new Map<string, { clears: number; bestMs: number | null }>()
  const clearsByDay = new Map<string, number>()

  for (const run of completedRanked) {
    const accuracy = getRunAccuracy(run)
    const cityEntry = byCity.get(run.citySlug) ?? { clears: 0, bestMs: null, accuracyTotal: 0 }
    cityEntry.clears += 1
    cityEntry.accuracyTotal += accuracy
    if (run.completionMs != null && (cityEntry.bestMs == null || run.completionMs < cityEntry.bestMs)) {
      cityEntry.bestMs = run.completionMs
    }
    byCity.set(run.citySlug, cityEntry)

    const rulesetEntry = byRuleset.get(run.ruleset) ?? { clears: 0, bestMs: null }
    rulesetEntry.clears += 1
    if (run.completionMs != null && (rulesetEntry.bestMs == null || run.completionMs < rulesetEntry.bestMs)) {
      rulesetEntry.bestMs = run.completionMs
    }
    byRuleset.set(run.ruleset, rulesetEntry)

    const dayKey = getDateKey(run.createdAt)
    clearsByDay.set(dayKey, (clearsByDay.get(dayKey) ?? 0) + 1)
  }

  const battleWins = battles.filter((battle) => battle.winnerUserId === userId).length
  const battleLosses = battles.filter(
    (battle) =>
      battle.status === 'COMPLETED' &&
      battle.winnerUserId &&
      battle.winnerUserId !== userId,
  ).length
  const noContest = battles.filter(
    (battle) => !battle.winnerUserId && (battle.status === 'COMPLETED' || battle.status === 'EXPIRED'),
  ).length

  return {
    totals: {
      rankedClears: completedRanked.length,
      disqualifiedRuns: disqualified.length,
      revealDisqualifications: revealDisqualified.length,
      totalXp: completedRanked.reduce((sum, run) => sum + (run.xpAwarded ?? 0), 0),
      battleWins,
      battleLosses,
      noContestBattles: noContest,
    },
    clearsByDay: Array.from(clearsByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, clears]) => ({ dateKey, clears })),
    cityBreakdown: Array.from(byCity.entries())
      .sort((a, b) => b[1].clears - a[1].clears)
      .slice(0, 12)
      .map(([citySlug, entry]) => ({
        citySlug,
        cityName: findRankedCity(citySlug)?.name ?? citySlug,
        clears: entry.clears,
        bestMs: entry.bestMs,
        averageAccuracy: entry.clears > 0 ? entry.accuracyTotal / entry.clears : 0,
      })),
    rulesetBreakdown: Array.from(byRuleset.entries()).map(([ruleset, entry]) => ({
      ruleset: fromPrismaRankedRuleset(ruleset as any),
      clears: entry.clears,
      bestMs: entry.bestMs,
    })),
  }
}
