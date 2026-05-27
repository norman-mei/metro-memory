import registry from './miniCitiesRegistry.json'

export type MiniCityCountingMode = 'mini'

export interface MiniCityDefinition {
  slug: string
  name: string
  link: string
  assetSourceSlug?: string
  parentSlug: string
  parentName: string
  parentLink: string
  parentPath: string
  continent: string
  country: string
  keywords: string[]
  countingMode: MiniCityCountingMode
  includeLines: string[]
  image?: string
  icon?: string
  openGraphImage?: string
}

export const MINI_CITY_MARKER_COORDINATES: Record<string, [number, number]> = {
  'gba-guangzhou': [113.2644, 23.1291],
  'gba-foshan': [113.1214, 23.0215],
  'gba-dongguan': [113.7518, 23.0207],
  'gba-shenzhen': [114.0579, 22.5431],
  'gba-hong-kong': [114.1694, 22.3193],
  'gba-mtr-heavy-rail': [114.1559, 22.3019],
  'gba-mtr-light-rail': [113.9761, 22.3947],
  'gba-macau': [113.5439, 22.1987],
  'chicago-cta': [-87.6276, 41.8837],
  'chicago-metra': [-87.6401, 41.8786],
  'california-state-los-angeles': [-118.2437, 34.0522],
  'california-state-bay-area': [-122.2711, 37.8044],
  'california-state-muni': [-122.4194, 37.7749],
  'california-state-san-diego': [-117.1611, 32.7157],
  'california-state-sacramento': [-121.4944, 38.5816],
  'california-state-bart': [-122.2711, 37.8044],
  'california-state-caltrain': [-122.3959, 37.7764],
  'california-state-vta': [-121.8863, 37.3382],
  'california-state-la-metro': [-118.2437, 34.0522],
  'california-state-metrolink': [-118.2365, 34.0562],
  'nyc-subway': [-73.9911, 40.7506],
  'nyc-lirr': [-73.7906, 40.7003],
  'nyc-mnr': [-73.9772, 40.7527],
  'nyc-ctrail': [-72.9251, 41.2977],
  'nyc-mta-commuter-rail': [-73.9715, 40.7512],
  'nyc-mta': [-73.9816, 40.7561],
  'nyc-path': [-74.0138, 40.7162],
  'nyc-rapid-transit': [-73.9854, 40.7589],
  'nyc-njt-light-rail': [-74.0436, 40.7194],
  'nyc-njt-commuter-rail': [-74.1687, 40.7346],
  'nyc-njt': [-74.1644, 40.7349],
  'nyc-panynj': [-74.0119, 40.7116],
  'boston-subway-light-rail': [-71.0695, 42.3564],
  'boston-commuter-rail': [-71.0552, 42.3522],
  'dc-washington-dc': [-77.0288, 38.9017],
  'dc-baltimore': [-76.6122, 39.2904],
  'florida-state-miami': [-80.1918, 25.7617],
  'florida-state-orlando': [-81.3792, 28.5383],
  'florida-state-tampa': [-82.4572, 27.9506],
  'florida-state-jacksonville': [-81.6557, 30.3322],
  'philly-metro-patco': [-75.1578, 39.9496],
  'philly-regional-rail': [-75.182, 39.9556],
  'toronto-waterloo-ttc': [-79.3832, 43.6532],
  'toronto-waterloo-ttc-subway': [-79.3857, 43.6708],
  'toronto-waterloo-ttc-streetcars': [-79.3927, 43.6526],
  'toronto-waterloo-go-up': [-79.3791, 43.6453],
  'toronto-waterloo-metrolinx': [-79.6441, 43.589],
}

export interface ParentCitySplitDefinition {
  parentSlug: string
  parentName: string
  parentLink: string
  parentPath: string
  continent: string
  country: string
  children: MiniCityDefinition[]
}

export interface MiniCityStatsEntry {
  slug: string
  name: string
  parentSlug: string
  parentName: string
  link: string
  percent: number
  found: number
  total: number
}

type RegistryParent = {
  parentSlug: string
  parentName: string
  parentLink: string
  parentPath: string
  continent: string
  country: string
  children: Array<{
    slug: string
    name: string
    link: string
    assetSourceSlug?: string
    keywords?: string[]
    countingMode: MiniCityCountingMode
    includeLines: string[]
    image?: string
    icon?: string
    openGraphImage?: string
  }>
}

const rawParents = (registry.parents ?? []) as RegistryParent[]

export const CITY_SPLIT_PARENTS: ParentCitySplitDefinition[] = rawParents.map(
  (parent) => ({
    parentSlug: parent.parentSlug,
    parentName: parent.parentName,
    parentLink: parent.parentLink,
    parentPath: parent.parentPath,
    continent: parent.continent,
    country: parent.country,
    children: parent.children.map((child) => ({
      slug: child.slug,
      name: child.name,
      link: child.link,
      assetSourceSlug: child.assetSourceSlug,
      parentSlug: parent.parentSlug,
      parentName: parent.parentName,
      parentLink: parent.parentLink,
      parentPath: parent.parentPath,
      continent: parent.continent,
      country: parent.country,
      keywords: Array.isArray(child.keywords) ? child.keywords : [],
      countingMode: child.countingMode,
      includeLines: Array.isArray(child.includeLines) ? child.includeLines : [],
      image: child.image,
      icon: child.icon,
      openGraphImage: child.openGraphImage,
    })),
  }),
)

export const MINI_CITIES: MiniCityDefinition[] = CITY_SPLIT_PARENTS.flatMap(
  (parent) => parent.children,
)

const miniCityBySlug = new Map(MINI_CITIES.map((entry) => [entry.slug, entry]))
const parentBySlug = new Map(
  CITY_SPLIT_PARENTS.map((entry) => [entry.parentSlug, entry]),
)

export const getMiniCityBySlug = (slug: string | null | undefined) =>
  (slug ? miniCityBySlug.get(slug) : undefined) ?? null

export const getMiniCitiesForParent = (parentSlug: string | null | undefined) =>
  (parentSlug ? parentBySlug.get(parentSlug)?.children : undefined) ?? []

export const getMiniCityParentDefinition = (
  parentSlug: string | null | undefined,
) => (parentSlug ? parentBySlug.get(parentSlug) : undefined) ?? null

export const isMiniCitySlug = (slug: string | null | undefined): boolean =>
  Boolean(slug && miniCityBySlug.has(slug))

export const getMiniCityFamilyByCountryBase = (
  basePath: string,
): ParentCitySplitDefinition[] =>
  CITY_SPLIT_PARENTS.filter((entry) =>
    entry.parentLink.startsWith(basePath),
  )

export const getMiniCityLinksForSlug = (slug: string) => {
  const miniCity = getMiniCityBySlug(slug)
  if (miniCity) {
    const siblings = getMiniCitiesForParent(miniCity.parentSlug)
    return {
      mode: 'child' as const,
      parent: getMiniCityParentDefinition(miniCity.parentSlug),
      current: miniCity,
      siblings,
    }
  }

  const children = getMiniCitiesForParent(slug)
  if (children.length > 0) {
    return {
      mode: 'parent' as const,
      parent: getMiniCityParentDefinition(slug),
      current: null,
      siblings: children,
    }
  }

  return null
}

export const resolveMiniCityParentSlugForIcon = (slug: string): string | null =>
  getMiniCityBySlug(slug)?.parentSlug ??
  (slug.startsWith('custom-') ? slug.slice('custom-'.length) : null)
