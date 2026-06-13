const normalizeAliasSpacing = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/^[,\-]\s*/g, '')
    .replace(/\s*[,\-]\s*$/g, '')
    .trim()

const CHINESE_STATION_SUFFIXES = [
  '高速铁路站',
  '高速鐵路站',
  '高铁站',
  '高鐵站',
  '火车站',
  '火車站',
  '铁路站',
  '鐵路站',
  '地铁站',
  '地鐵站',
  '车站',
  '車站',
  '站',
]

const stripChineseStationSuffixes = (value: string) => {
  let output = value
  let changed = true

  while (changed) {
    changed = false
    CHINESE_STATION_SUFFIXES.forEach((suffix) => {
      const suffixPattern = new RegExp(`${suffix}(?=\\s*[)）]|$)`, 'g')
      const next = output.replace(suffixPattern, '')
      if (next !== output) {
        output = next
        changed = true
      }
    })
  }

  return output
}

const applyStationlessTransform = (value: string) =>
  normalizeAliasSpacing(
    stripChineseStationSuffixes(value)
      .replace(/\brailway\s+stations?\b/gi, ' ')
      .replace(/\brail\s+stations?\b/gi, ' ')
      .replace(/\bstations?\b/gi, ' ')
      .replace(/\brailways?\b/gi, ' ')
      .replace(/\brail\b/gi, ' '),
  )

export const generateStationlessAlternates = (value?: string): string[] => {
  const input = (value ?? '').trim()
  if (
    !input ||
    !/\bstation(s)?\b|\brailways?\b|\brail\b|[\u3400-\u9fff]/i.test(input)
  ) {
    return []
  }

  const alternates = new Set<string>()
  let current = input

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const stripped = applyStationlessTransform(current)
    if (!stripped || stripped.toLowerCase() === current.toLowerCase()) {
      break
    }
    if (stripped.toLowerCase() !== input.toLowerCase()) {
      alternates.add(stripped)
    }
    current = stripped
  }

  return Array.from(alternates)
}
