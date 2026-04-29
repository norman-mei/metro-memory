import { prisma } from '@/lib/prisma'
import { STATION_TOTALS } from '@/lib/stationTotals'
import { DEFAULT_RANKED_RULESET, type RankedRulesetId, parseRankedRuleset, toPrismaRankedRuleset } from '@/lib/ranked'
import { findRankedCity, getRankedCities } from '@/lib/rankedServer'

export const PLAYLIST_LAUNCH_MODES = [
  'casual',
  'ranked-classic',
  'ranked-ruleset',
] as const

export type PlaylistLaunchModeId = (typeof PLAYLIST_LAUNCH_MODES)[number]

export function parsePlaylistLaunchMode(value: unknown): PlaylistLaunchModeId {
  return typeof value === 'string' && (PLAYLIST_LAUNCH_MODES as readonly string[]).includes(value)
    ? (value as PlaylistLaunchModeId)
    : 'ranked-classic'
}

export function formatPlaylistLaunchMode(mode: PlaylistLaunchModeId) {
  switch (mode) {
    case 'casual':
      return 'Casual'
    case 'ranked-ruleset':
      return 'Ranked Ruleset'
    case 'ranked-classic':
    default:
      return 'Ranked Classic'
  }
}

export function toPrismaPlaylistLaunchMode(mode: PlaylistLaunchModeId) {
  switch (mode) {
    case 'casual':
      return 'CASUAL' as const
    case 'ranked-ruleset':
      return 'RANKED_RULESET' as const
    case 'ranked-classic':
    default:
      return 'RANKED_CLASSIC' as const
  }
}

export function fromPrismaPlaylistLaunchMode(
  value: 'CASUAL' | 'RANKED_CLASSIC' | 'RANKED_RULESET' | null | undefined,
): PlaylistLaunchModeId {
  switch (value) {
    case 'CASUAL':
      return 'casual'
    case 'RANKED_RULESET':
      return 'ranked-ruleset'
    case 'RANKED_CLASSIC':
    default:
      return 'ranked-classic'
  }
}

type CampaignDefinition = {
  slug: string
  title: string
  description: string
  themeColor: string
  citySlugs: string[]
}

type SeasonDefinition = {
  slug: string
  title: string
  description: string
  themeColor: string
  startDate: Date
  endDate: Date
  events: Array<{
    slug: string
    title: string
    description: string
    eventType: 'CITY_CLEAR' | 'RULESET_CLEAR' | 'BATTLE_WIN'
    citySlug?: string
    cityPath?: string
    ruleset?: RankedRulesetId
    targetCount: number
    rewardXp: number
  }>
}

type SeasonBlueprintContext = {
  monthLabel: string
  seasonIndex: number
  cities: ReturnType<typeof getSortedCitiesBySize>
}

type SeasonBlueprint = {
  slug: string
  title: (context: SeasonBlueprintContext) => string
  description: (context: SeasonBlueprintContext) => string
  themeColor: string
  buildEvents: (context: SeasonBlueprintContext) => SeasonDefinition['events']
}

type SeasonEventDefinition = SeasonDefinition['events'][number]

function getSortedCitiesBySize() {
  return [...getRankedCities()].sort((a, b) => {
    const aTotal = STATION_TOTALS[a.slug] ?? 0
    const bTotal = STATION_TOTALS[b.slug] ?? 0
    if (aTotal !== bTotal) {
      return bTotal - aTotal
    }
    return a.name.localeCompare(b.name)
  })
}

function getMonthWindow(now = new Date()) {
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { startDate, endDate }
}

function pickCity(
  cities: ReturnType<typeof getSortedCitiesBySize>,
  seasonIndex: number,
  offset: number,
  filter?: (city: ReturnType<typeof getSortedCitiesBySize>[number]) => boolean,
) {
  const pool = filter ? cities.filter(filter) : cities
  if (pool.length === 0) {
    return null
  }
  const normalizedIndex = (seasonIndex + offset) % pool.length
  return pool[normalizedIndex] ?? pool[0]
}

function createCityClearEvent(options: {
  slug: string
  title: string
  description: string
  city: ReturnType<typeof getSortedCitiesBySize>[number] | null
  rewardXp: number
  targetCount?: number
}): SeasonEventDefinition | null {
  if (!options.city) {
    return null
  }

  return {
    slug: options.slug,
    title: options.title,
    description: options.description,
    eventType: 'CITY_CLEAR' as const,
    citySlug: options.city.slug,
    cityPath: options.city.path,
    targetCount: options.targetCount ?? 1,
    rewardXp: options.rewardXp,
  }
}

const SEASON_BLUEPRINTS: SeasonBlueprint[] = [
  {
    slug: 'signal-sprint',
    title: ({ monthLabel }) => `${monthLabel} Signal Sprint`,
    description: () =>
      'A monthly season focused on classic clears, one featured city, one strict-spelling clear, and a battle win.',
    themeColor: '#dc2626',
    buildEvents: ({ cities, seasonIndex }) => {
      const featuredCity = pickCity(cities, seasonIndex, 0)
      const starterCity = pickCity(
        cities,
        seasonIndex,
        1,
        (city) => (STATION_TOTALS[city.slug] ?? 0) <= 40,
      )

      return [
        {
          slug: 'classic-three',
          title: 'Three Classic Clears',
          description: 'Post three valid classic ranked clears this month.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'classic' as const,
          targetCount: 3,
          rewardXp: 180,
        },
        createCityClearEvent({
          slug: 'featured-city',
          title: `Featured City: ${featuredCity?.name ?? 'Metro Network'}`,
          description: 'Clear the featured city in classic mode.',
          city: featuredCity,
          rewardXp: 120,
        }),
        {
          slug: 'strict-spelling',
          title: 'Strict Spelling Clear',
          description: 'Record one valid strict-spelling ranked clear on any city.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'strict-spelling' as const,
          targetCount: 1,
          rewardXp: 140,
        },
        {
          slug: 'battle-win',
          title: 'Battle Win',
          description: 'Win one async battle this month.',
          eventType: 'BATTLE_WIN' as const,
          targetCount: 1,
          rewardXp: 200,
        },
        createCityClearEvent({
          slug: 'starter-city',
          title: `Small-System Sprint: ${starterCity?.name ?? 'Starter System'}`,
          description: 'Clear one of the fast starter systems for a season boost.',
          city: starterCity,
          rewardXp: 100,
        }),
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
  {
    slug: 'world-tour',
    title: ({ monthLabel }) => `${monthLabel} World Tour`,
    description: () =>
      'A globe-spanning season that hops between continents, asks for steady classic clears, and rewards one battle win.',
    themeColor: '#0891b2',
    buildEvents: ({ cities, seasonIndex }) => {
      const continents = ['Asia', 'Europe', 'North America']
      const continentEvents = continents.map((continent, index) =>
        createCityClearEvent({
          slug: `continent-stop-${index + 1}`,
          title: `${continent} Stop: ${
            pickCity(cities, seasonIndex, index, (city) => city.continent === continent)?.name ??
            continent
          }`,
          description: `Clear one featured ${continent.toLowerCase()} network this month.`,
          city: pickCity(cities, seasonIndex, index, (city) => city.continent === continent),
          rewardXp: 120 + index * 10,
        }),
      )

      return [
        ...continentEvents,
        {
          slug: 'classic-five',
          title: 'Five Classic Clears',
          description: 'Post five valid classic ranked clears during the tour.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'classic' as const,
          targetCount: 5,
          rewardXp: 220,
        },
        {
          slug: 'battle-win',
          title: 'Battle Passport',
          description: 'Secure one async battle win to stamp the passport.',
          eventType: 'BATTLE_WIN' as const,
          targetCount: 1,
          rewardXp: 180,
        },
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
  {
    slug: 'precision-protocol',
    title: ({ monthLabel }) => `${monthLabel} Precision Protocol`,
    description: () =>
      'A stricter season that leans into harder rulesets and a pair of focused city clears.',
    themeColor: '#7c3aed',
    buildEvents: ({ cities, seasonIndex }) => {
      const majorCity = pickCity(cities, seasonIndex, 2)
      const europeCity = pickCity(cities, seasonIndex, 3, (city) => city.continent === 'Europe')

      return [
        {
          slug: 'strict-spelling',
          title: 'Strict Spelling Run',
          description: 'Record one strict-spelling ranked clear on any city.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'strict-spelling' as const,
          targetCount: 1,
          rewardXp: 180,
        },
        {
          slug: 'no-line-colors',
          title: 'No Line Colors Run',
          description: 'Complete one ranked run without line colors.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'no-line-colors' as const,
          targetCount: 1,
          rewardXp: 180,
        },
        createCityClearEvent({
          slug: 'major-city',
          title: `Major Network Drill: ${majorCity?.name ?? 'Metro Network'}`,
          description: 'Beat the featured large network this month.',
          city: majorCity,
          rewardXp: 150,
        }),
        createCityClearEvent({
          slug: 'europe-focus',
          title: `European Focus: ${europeCity?.name ?? 'European Network'}`,
          description: 'Clear the featured European network for a precision bonus.',
          city: europeCity,
          rewardXp: 140,
        }),
        {
          slug: 'classic-two',
          title: 'Two Classic Clears',
          description: 'Stay sharp with two classic ranked clears.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'classic' as const,
          targetCount: 2,
          rewardXp: 100,
        },
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
  {
    slug: 'metro-marathon',
    title: ({ monthLabel }) => `${monthLabel} Metro Marathon`,
    description: () =>
      'A longer-form season built around four city clears, steady classic play, and one battle result.',
    themeColor: '#ea580c',
    buildEvents: ({ cities, seasonIndex }) => {
      const challengeCities = [0, 1, 2, 3].map((offset) => pickCity(cities, seasonIndex, offset + 4))
      return [
        ...challengeCities.map((city, index) =>
          createCityClearEvent({
            slug: `marathon-leg-${index + 1}`,
            title: `Marathon Leg ${index + 1}: ${city?.name ?? 'Metro Network'}`,
            description: 'Complete this marathon stop as part of the monthly route.',
            city,
            rewardXp: 90 + index * 15,
          }),
        ),
        {
          slug: 'classic-four',
          title: 'Four Classic Clears',
          description: 'Keep the marathon streak alive with four classic ranked clears.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'classic' as const,
          targetCount: 4,
          rewardXp: 160,
        },
        {
          slug: 'battle-win',
          title: 'Battle Checkpoint',
          description: 'Win one async battle before the season closes.',
          eventType: 'BATTLE_WIN' as const,
          targetCount: 1,
          rewardXp: 180,
        },
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
  {
    slug: 'continental-clash',
    title: ({ monthLabel }) => `${monthLabel} Continental Clash`,
    description: () =>
      'A continent-vs-continent season that rotates featured cities and adds a one-life high-pressure run.',
    themeColor: '#16a34a',
    buildEvents: ({ cities, seasonIndex }) => {
      const asiaCity = pickCity(cities, seasonIndex, 5, (city) => city.continent === 'Asia')
      const northAmericaCity = pickCity(
        cities,
        seasonIndex,
        6,
        (city) => city.continent === 'North America',
      )
      const europeCity = pickCity(cities, seasonIndex, 7, (city) => city.continent === 'Europe')

      return [
        createCityClearEvent({
          slug: 'asia-match',
          title: `Asia Match: ${asiaCity?.name ?? 'Asian Network'}`,
          description: 'Score one ranked clear on the featured Asian system.',
          city: asiaCity,
          rewardXp: 130,
        }),
        createCityClearEvent({
          slug: 'north-america-match',
          title: `North America Match: ${northAmericaCity?.name ?? 'North American Network'}`,
          description: 'Score one ranked clear on the featured North American system.',
          city: northAmericaCity,
          rewardXp: 130,
        }),
        createCityClearEvent({
          slug: 'europe-match',
          title: `Europe Match: ${europeCity?.name ?? 'European Network'}`,
          description: 'Score one ranked clear on the featured European system.',
          city: europeCity,
          rewardXp: 130,
        }),
        {
          slug: 'one-life',
          title: 'One Life Victory',
          description: 'Complete one one-life ranked clear on any city.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'one-life' as const,
          targetCount: 1,
          rewardXp: 220,
        },
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
  {
    slug: 'night-service',
    title: ({ monthLabel }) => `${monthLabel} Night Service`,
    description: () =>
      'A moody late-month rotation built around smaller systems, more classic clears, and efficient ranked runs.',
    themeColor: '#2563eb',
    buildEvents: ({ cities, seasonIndex }) => {
      const smallerCities = [0, 1, 2].map((offset) =>
        pickCity(cities, seasonIndex, offset, (city) => (STATION_TOTALS[city.slug] ?? 0) <= 55),
      )

      return [
        ...smallerCities.map((city, index) =>
          createCityClearEvent({
            slug: `night-stop-${index + 1}`,
            title: `Night Stop ${index + 1}: ${city?.name ?? 'Metro Network'}`,
            description: 'Clear this smaller system as part of the overnight run.',
            city,
            rewardXp: 95 + index * 15,
          }),
        ),
        {
          slug: 'classic-six',
          title: 'Six Classic Clears',
          description: 'Stay on schedule with six classic ranked clears.',
          eventType: 'RULESET_CLEAR' as const,
          ruleset: 'classic' as const,
          targetCount: 6,
          rewardXp: 240,
        },
        {
          slug: 'battle-win',
          title: 'Last Train Standing',
          description: 'End the month with one async battle win.',
          eventType: 'BATTLE_WIN' as const,
          targetCount: 1,
          rewardXp: 150,
        },
      ].filter((event): event is NonNullable<typeof event> => Boolean(event))
    },
  },
]

function buildCampaignDefinitions(): CampaignDefinition[] {
  const cities = getSortedCitiesBySize()
  const starter = [...cities]
    .filter((city) => (STATION_TOTALS[city.slug] ?? 0) <= 40)
    .slice(0, 6)
    .map((city) => city.slug)
  const northAmerica = [...cities]
    .filter((city) => city.continent === 'North America')
    .slice(0, 8)
    .map((city) => city.slug)
  const europe = [...cities]
    .filter((city) => city.continent === 'Europe')
    .slice(0, 8)
    .map((city) => city.slug)
  const asia = [...cities]
    .filter((city) => city.continent === 'Asia')
    .slice(0, 8)
    .map((city) => city.slug)

  return [
    {
      slug: 'starter-sprint',
      title: 'Starter Sprint',
      description: 'Six smaller systems to lock in fast early progression.',
      themeColor: '#1d4ed8',
      citySlugs: starter,
    },
    {
      slug: 'north-america-corridor',
      title: 'North America Corridor',
      description: 'A cross-continent pack of North American heavy hitters.',
      themeColor: '#0f766e',
      citySlugs: northAmerica,
    },
    {
      slug: 'european-classics',
      title: 'European Classics',
      description: 'Eight European systems with dense interchange memory tests.',
      themeColor: '#9333ea',
      citySlugs: europe,
    },
    {
      slug: 'asia-megasystems',
      title: 'Asia Megasystems',
      description: 'Large Asian networks tuned for high-XP campaign clears.',
      themeColor: '#ea580c',
      citySlugs: asia,
    },
  ].filter((campaign) => campaign.citySlugs.length > 0)
}

function buildSeasonDefinition(now = new Date()): SeasonDefinition {
  const { startDate, endDate } = getMonthWindow(now)
  const monthLabel = startDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const seasonIndex = startDate.getUTCFullYear() * 12 + startDate.getUTCMonth()
  const cities = getSortedCitiesBySize()
  const blueprint = SEASON_BLUEPRINTS[seasonIndex % SEASON_BLUEPRINTS.length]
  const context = {
    monthLabel,
    seasonIndex,
    cities,
  } satisfies SeasonBlueprintContext
  const slug = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${blueprint.slug}`

  return {
    slug,
    title: blueprint.title(context),
    description: blueprint.description(context),
    themeColor: blueprint.themeColor,
    startDate,
    endDate,
    events: blueprint.buildEvents(context),
  }
}

export async function ensureCampaignCatalog() {
  const definitions = buildCampaignDefinitions()

  await prisma.$transaction(
    definitions.map((definition) =>
      prisma.campaign.upsert({
        where: { slug: definition.slug },
        update: {
          title: definition.title,
          description: definition.description,
          themeColor: definition.themeColor,
          active: true,
        },
        create: {
          slug: definition.slug,
          title: definition.title,
          description: definition.description,
          themeColor: definition.themeColor,
          active: true,
        },
      }),
    ),
  )

  for (const definition of definitions) {
    const campaign = await prisma.campaign.findUnique({
      where: { slug: definition.slug },
      select: { id: true },
    })
    if (!campaign) {
      continue
    }
    await prisma.campaignCity.deleteMany({
      where: { campaignId: campaign.id },
    })
    await prisma.campaignCity.createMany({
      data: definition.citySlugs
        .map((citySlug, index) => {
          const city = findRankedCity(citySlug)
          if (!city) {
            return null
          }
          return {
            campaignId: campaign.id,
            citySlug,
            cityPath: city.path,
            orderIndex: index,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    })
  }

  return prisma.campaign.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    include: {
      cities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  })
}

export async function ensureCurrentSeason(now = new Date()) {
  const definition = buildSeasonDefinition(now)

  await prisma.season.updateMany({
    where: {
      slug: { not: definition.slug },
      active: true,
    },
    data: { active: false },
  })

  const season = await prisma.season.upsert({
    where: { slug: definition.slug },
    update: {
      title: definition.title,
      description: definition.description,
      themeColor: definition.themeColor,
      startDate: definition.startDate,
      endDate: definition.endDate,
      active: true,
    },
    create: {
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      themeColor: definition.themeColor,
      startDate: definition.startDate,
      endDate: definition.endDate,
      active: true,
    },
  })

  await prisma.seasonEvent.deleteMany({
    where: { seasonId: season.id },
  })

  await prisma.seasonEvent.createMany({
    data: definition.events.map((event) => ({
      seasonId: season.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      citySlug: event.citySlug ?? null,
      cityPath: event.cityPath ?? null,
      ruleset: event.ruleset ? toPrismaRankedRuleset(event.ruleset) : null,
      targetCount: event.targetCount,
      rewardXp: event.rewardXp,
    })),
  })

  return prisma.season.findUniqueOrThrow({
    where: { id: season.id },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function ensureLiveOpsCatalog(now = new Date()) {
  const [campaigns, season] = await Promise.all([
    ensureCampaignCatalog(),
    ensureCurrentSeason(now),
  ])

  return { campaigns, season }
}

export function resolvePlaylistRunRuleset(options: {
  mode: PlaylistLaunchModeId
  ruleset?: RankedRulesetId | null
}) {
  if (options.mode === 'casual') {
    return null
  }
  if (options.mode === 'ranked-ruleset') {
    return parseRankedRuleset(options.ruleset ?? DEFAULT_RANKED_RULESET)
  }
  return DEFAULT_RANKED_RULESET
}
