import { repairMojibakeString } from './repairMojibake.ts'
import type { DataFeature } from './types.ts'

export type ManualComplexSelector = {
  name: string
  line?: string
  linePrefix?: string
}

export const repairManualComplexGroups = (groups: ManualComplexSelector[][]) =>
  groups.map((group) =>
    group.map((selector) => ({
      ...selector,
      name: repairMojibakeString(selector.name),
    })),
  )

export const featureMatchesManualComplexSelector = (
  feature: DataFeature,
  selector: ManualComplexSelector,
) => {
  const selectorName = repairMojibakeString(selector.name).trim().toLowerCase()
  if (!selectorName) {
    return false
  }

  const propertiesWithAlternates = feature.properties as typeof feature.properties & {
    alternate_names?: string[]
  }
  const candidateNames = new Set<string>()

  ;[
    feature.properties?.name,
    feature.properties?.long_name,
    feature.properties?.short_name,
    ...(Array.isArray(propertiesWithAlternates.alternate_names)
      ? propertiesWithAlternates.alternate_names
      : []),
  ]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => repairMojibakeString(entry).trim().toLowerCase())
    .forEach((entry) => candidateNames.add(entry))

  if (!candidateNames.has(selectorName)) {
    return false
  }

  const line = feature.properties?.line
  if (selector.line && line !== selector.line) {
    return false
  }
  if (selector.linePrefix && !(line && line.startsWith(selector.linePrefix))) {
    return false
  }

  return true
}
