import { generateLineKeywords } from './registryCoverage.ts'
import type { Registry, RichLineProposal } from './types.ts'

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const normalizeBootstrapSeedName = (value: string | undefined | null) =>
  String(value || '')
    .replace(/\((?:north|south|east|west|clockwise|counterclockwise|inbound|outbound|inner|outer)[^)]+\)/gi, ' ')
    .replace(/\b(?:northbound|southbound|eastbound|westbound|clockwise|counterclockwise|inbound|outbound|inner|outer|branch|shuttle)\b/gi, ' ')
    .replace(/\b(?:to|towards|via)\s+[^,;/-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const collectNameCandidates = (props: Record<string, any>, localLanguages: string[]) => {
  const values = new Set<string>()
  const add = (val?: string) => {
    if (val && val.trim()) values.add(val.trim())
  }

  add(props.name)
  add(props['name:en'])
  add(props.ref)
  add(props.network)
  add(props.operator)
  add(props.route)
  Object.keys(props).forEach((key) => {
    if (key.startsWith('name:')) add(props[key])
  })
  localLanguages.forEach((lang) => {
    add(props[`name:${lang}`])
    add(props[`name:${lang}-Latn`])
  })

  return Array.from(values)
}

const toPascalCase = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const buildLineId = (city: string, lineName: string) =>
  `${toPascalCase(city)}${toPascalCase(lineName)}`.slice(0, 80)

const inferTextColor = (hex: string) => {
  const color = hex.replace('#', '')
  if (color.length !== 6) return '#FFFFFF'
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const brightness = r * 0.299 + g * 0.587 + b * 0.114
  return brightness >= 150 ? '#1F1F1F' : '#FFFFFF'
}

const darkenHexColor = (hex: string, factor = 0.52) => {
  const color = hex.replace('#', '')
  if (color.length !== 6) return hex
  const channels = [0, 2, 4].map((index) =>
    Math.max(0, Math.min(255, Math.round(parseInt(color.slice(index, index + 2), 16) * factor))),
  )
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

const normalizeHexColor = (value: string | undefined | null) => {
  const color = String(value || '').trim()
  if (!color) return null
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(color)) return `#${color.toUpperCase()}`
  return null
}

const selectMostCommon = (values: string[]) => {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
  let best = ''
  let bestCount = 0
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  })
  return best || null
}

type BootstrapSeed = {
  key: string
  name: string
  features: any[]
}

export const discoverBootstrapLineSeeds = (
  registry: Registry,
  lineFeatures: any[],
): BootstrapSeed[] => {
  const localLanguages = registry.localLanguages || []
  const knownKeywords = new Set(
    (registry.lines || []).flatMap((line) => (line.keywords || []).map(normalize)),
  )
  const grouped = new Map<string, BootstrapSeed>()

  lineFeatures.forEach((feature: any) => {
    const props = feature.properties || {}
    const candidateNames = collectNameCandidates(props, localLanguages)
    const normalizedNames = candidateNames.map(normalize).filter(Boolean)
    const matchesKnown = normalizedNames.some((name) => knownKeywords.has(name))
    if (matchesKnown) return

    const preferredName =
      props['name:en'] ||
      props.name ||
      props.ref ||
      candidateNames.find(Boolean) ||
      [
        typeof props.network === 'string' ? props.network : null,
        typeof props.operator === 'string' ? props.operator : null,
        typeof props.route === 'string' ? props.route : null,
      ]
        .filter(Boolean)
        .join(' ')

    if (!preferredName || !String(preferredName).trim()) return

    const dedupeRef =
      typeof props.ref === 'string' && props.ref.trim()
        ? normalize(props.ref)
        : null
    const cleanedName = normalizeBootstrapSeedName(String(preferredName))
    const key = dedupeRef || normalize(cleanedName || String(preferredName))
    if (!key) return

    const existing = grouped.get(key)
    if (existing) {
      existing.features.push(feature)
      return
    }

    grouped.set(key, {
      key,
      name: cleanedName || String(preferredName).trim(),
      features: [feature],
    })
  })

  return Array.from(grouped.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

export const buildBootstrapLineProposals = ({
  registry,
  lineFeatures,
  startOrder = 0,
}: {
  registry: Registry
  lineFeatures: any[]
  startOrder?: number
}): RichLineProposal[] => {
  const existingIds = new Set((registry.lines || []).map((line) => line.id))
  const seeds = discoverBootstrapLineSeeds(registry, lineFeatures)

  return seeds.map((seed, index) => {
    const props = seed.features[0]?.properties || {}
    const color = selectMostCommon(
      seed.features
        .map((feature) =>
          normalizeHexColor(
            feature?.properties?.colour ||
              feature?.properties?.color ||
              feature?.properties?.line_colour,
          ),
        )
        .filter((value): value is string => Boolean(value)),
    )
    const baseId = buildLineId(registry.city, seed.name)
    let lineId = baseId
    let suffix = 2
    while (existingIds.has(lineId)) {
      lineId = `${baseId}${suffix}`
      suffix += 1
    }
    existingIds.add(lineId)

    const resolvedColor = color || '#888888'

    return {
      id: lineId,
      name: seed.name,
      keywords: generateLineKeywords({
        id: lineId,
        name: seed.name,
        keywords: [
          props.name,
          props['name:en'],
          props.ref,
          props.network,
          props.operator,
        ].filter((value): value is string => Boolean(value && String(value).trim())),
      }),
      color: resolvedColor,
      backgroundColor: darkenHexColor(resolvedColor),
      textColor: inferTextColor(resolvedColor),
      progressOutlineColor: resolvedColor,
      order: startOrder + index,
      extractedColor: color || undefined,
      sourceName: props.name || props['name:en'] || seed.name,
      operator: typeof props.operator === 'string' ? props.operator : undefined,
      network: typeof props.network === 'string' ? props.network : undefined,
      routeSample: props,
    }
  })
}
