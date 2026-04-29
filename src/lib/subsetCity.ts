import bbox from '@turf/bbox'
import { Metadata } from 'next'

import { getCityIconPath, getCityOpenGraphImagePath } from './cityAssets'
import {
  Config,
  DataFeatureCollection,
  Line,
  LineGroup,
  LineGroupItem,
  RoutesFeatureCollection,
} from './types'
import { MiniCityDefinition } from './miniCities'

const EMPTY_ROUTES: RoutesFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

const filterLines = (
  lines: Record<string, Line>,
  includeLines: Set<string>,
): Record<string, Line> =>
  Object.fromEntries(
    Object.entries(lines).filter(([lineId]) => includeLines.has(lineId)),
  )

const filterLineGroups = (
  lineGroups: LineGroup[] | undefined,
  includeLines: Set<string>,
): LineGroup[] | undefined => {
  if (!lineGroups?.length) {
    return lineGroups
  }

  return lineGroups
    .map((group) => {
      const filteredItems = group.items
        .map((item) => {
          if (item.type !== 'lines') {
            return item
          }

          const lines = item.lines.filter((lineId) => includeLines.has(lineId))
          if (lines.length === 0) {
            return null
          }

          return {
            ...item,
            lines,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      const items = filteredItems.filter((item, index, array): item is LineGroupItem => {
        if (item.type !== 'separator') {
          return true
        }

        const hasPreviousLines = array
          .slice(0, index)
          .some((candidate) => candidate.type === 'lines')
        const hasFutureLines = array
          .slice(index + 1)
          .some((candidate) => candidate.type === 'lines')
        const previousItem = array[index - 1]

        return (
          hasPreviousLines &&
          hasFutureLines &&
          previousItem?.type !== 'separator'
        )
      })

      const hasVisibleLines = items.some((item) => item.type === 'lines')

      return hasVisibleLines
        ? {
            ...group,
            items,
          }
        : null
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
}

export const filterSubsetFeatures = (
  featureCollection: DataFeatureCollection,
  includeLines: string[],
): DataFeatureCollection => {
  const lineSet = new Set(includeLines)
  return {
    ...featureCollection,
    features: featureCollection.features.filter((feature) => {
      const lineId = feature.properties?.line
      return typeof lineId === 'string' && lineSet.has(lineId)
    }),
  }
}

export const filterSubsetRoutes = (
  routes: RoutesFeatureCollection | undefined,
  includeLines: string[],
): RoutesFeatureCollection => {
  if (!routes) {
    return EMPTY_ROUTES
  }

  const lineSet = new Set(includeLines)
  return {
    ...routes,
    features: routes.features.filter((feature) => {
      const lineId = feature.properties?.line
      return typeof lineId === 'string' && lineSet.has(lineId)
    }),
  }
}

const deriveSubsetBounds = (
  features: DataFeatureCollection,
  routes: RoutesFeatureCollection,
) => {
  const target =
    routes.features.length > 0
      ? routes
      : features.features.length > 0
        ? features
        : null

  if (!target) {
    return null
  }

  const [minLng, minLat, maxLng, maxLat] = bbox(target)
  if (
    ![minLng, minLat, maxLng, maxLat].every((value) => Number.isFinite(value)) ||
    maxLng <= minLng ||
    maxLat <= minLat
  ) {
    return null
  }

  return {
    bounds: [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]],
    maxBounds: [
      [minLng - 0.4, minLat - 0.4],
      [maxLng + 0.4, maxLat + 0.4],
    ] as [[number, number], [number, number]],
  }
}

const buildSubsetMetadata = (
  parentMetadata: Metadata,
  definition: MiniCityDefinition,
): Metadata => {
  const title = `${definition.name} Metro Memory`
  const description = `How many stations in ${definition.name} can you name?`
  const icon = definition.icon ?? getCityIconPath(definition.slug)
  const openGraphImage =
    definition.openGraphImage ?? getCityOpenGraphImagePath(definition.slug)

  return {
    ...parentMetadata,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    alternates: {
      ...(typeof parentMetadata.alternates === 'object' && parentMetadata.alternates
        ? parentMetadata.alternates
        : {}),
      canonical: definition.link,
    },
    title,
    description,
    openGraph: {
      ...(typeof parentMetadata.openGraph === 'object' && parentMetadata.openGraph
        ? parentMetadata.openGraph
        : {}),
      title,
      description,
      url: `https://metro-memory.com${definition.link}`,
      images: [openGraphImage],
    },
    twitter: {
      ...(typeof parentMetadata.twitter === 'object' && parentMetadata.twitter
        ? parentMetadata.twitter
        : {}),
      title,
      description,
      images: [openGraphImage],
    },
  }
}

export const buildSubsetConfig = (
  parentConfig: Config,
  definition: MiniCityDefinition,
  features: DataFeatureCollection,
  routes: RoutesFeatureCollection,
): Config => {
  const includeLines = new Set(definition.includeLines)
  const subsetBounds = deriveSubsetBounds(features, routes)
  const mapConfig = {
    ...parentConfig.MAP_CONFIG,
  }

  if (subsetBounds) {
    mapConfig.bounds = subsetBounds.bounds
    mapConfig.maxBounds = subsetBounds.maxBounds
  }

  return {
    ...parentConfig,
    CITY_NAME: definition.slug,
    ASSET_BASE_PATH: definition.parentPath,
    MAP_CONFIG: mapConfig,
    METADATA: buildSubsetMetadata(parentConfig.METADATA, definition),
    LINES: filterLines(parentConfig.LINES, includeLines),
    LINE_GROUPS: filterLineGroups(parentConfig.LINE_GROUPS, includeLines),
  }
}
