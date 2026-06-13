const normalizeAliasSpacing = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/^[,\-]\s*/g, '')
    .replace(/\s*[,\-]\s*$/g, '')
    .trim()

const ENGLISH_DIRECTION_PATTERN =
  '(?:north|south|east|west|northeast|northwest|southeast|southwest|n|s|e|w|ne|nw|se|sw)'

const PINYIN_DIRECTION_PATTERN =
  '(?:bei|nan|dong|xi|dong\\s*bei|xi\\s*bei|dong\\s*nan|xi\\s*nan|dongbei|xibei|dongnan|xinan)'

const ENGLISH_GATE_PATTERN = '(?:gate|entrance|entry|exit|portal)'
const PINYIN_GATE_PATTERN = '(?:men|kou|ru\\s*kou|chu\\s*kou|rukou|chukou)'

const ENGLISH_UNIVERSITY_GATE_PATTERNS = [
  new RegExp(
    `^(.+?\\b(?:university|univ\\.?|uni|college|institute|school|campus))\\s+(?:${ENGLISH_DIRECTION_PATTERN}\\s+)?${ENGLISH_GATE_PATTERN}$`,
    'i',
  ),
  new RegExp(
    `^(.+?\\b(?:university|univ\\.?|uni|college|institute|school|campus))\\s+${ENGLISH_GATE_PATTERN}\\s+${ENGLISH_DIRECTION_PATTERN}$`,
    'i',
  ),
]

const PINYIN_UNIVERSITY_GATE_PATTERNS = [
  new RegExp(
    `^(.+?\\b(?:da\\s*xue|daxue|xue\\s*yuan|xueyuan|xue\\s*xiao|xuexiao))\\s+(?:${PINYIN_DIRECTION_PATTERN}\\s+)?${PINYIN_GATE_PATTERN}$`,
    'i',
  ),
]

const CHINESE_DIRECTION_PATTERN =
  '(?:东北|東北|西北|东南|東南|西南|北|南|东|東|西)'
const CHINESE_GATE_PATTERN = '(?:校门|校門|大门|大門|门|門|入口|出口)'
const CHINESE_UNIVERSITY_GATE_PATTERNS = [
  new RegExp(
    `^(.+?(?:大学|大學|学院|學院|学校|學校|校区|校區))(?:${CHINESE_DIRECTION_PATTERN})?${CHINESE_GATE_PATTERN}$`,
  ),
  new RegExp(
    `^(.+?(?:大学|大學|学院|學院|学校|學校|校区|校區))${CHINESE_GATE_PATTERN}(?:${CHINESE_DIRECTION_PATTERN})$`,
  ),
]

const ENGLISH_INSTITUTION_SUFFIX_PATTERN =
  /\b(?:university|univ\.?|uni|college|institute|school|campus)$/i
const PINYIN_INSTITUTION_SUFFIX_PATTERN =
  /\b(?:da\s*xue|daxue|xue\s*yuan|xueyuan|xue\s*xiao|xuexiao)$/i
const CHINESE_INSTITUTION_SUFFIX_PATTERN =
  /(?:大学|大學|学院|學院|学校|學校|校区|校區)$/

const addAlias = (aliases: Set<string>, value: string, original: string) => {
  const normalized = normalizeAliasSpacing(value)
  if (!normalized || normalized.toLowerCase() === original.toLowerCase()) {
    return
  }
  aliases.add(normalized)
}

const addBaseAndInstitutionlessAliases = (
  aliases: Set<string>,
  base: string,
  original: string,
) => {
  const normalizedBase = normalizeAliasSpacing(base)
  if (!normalizedBase) {
    return
  }

  addAlias(aliases, normalizedBase, original)
  addAlias(
    aliases,
    normalizedBase.replace(ENGLISH_INSTITUTION_SUFFIX_PATTERN, ''),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(/\buniversity$/i, 'Univ'),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(/\buniversity$/i, 'Uni'),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(/\buniv\.?$/i, 'University'),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(/\buni$/i, 'University'),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(PINYIN_INSTITUTION_SUFFIX_PATTERN, ''),
    original,
  )
  addAlias(
    aliases,
    normalizedBase.replace(CHINESE_INSTITUTION_SUFFIX_PATTERN, ''),
    original,
  )
}

export const generateUniversityStationAlternates = (
  value?: string | null,
): string[] => {
  const input = normalizeAliasSpacing(value ?? '')
  if (!input) {
    return []
  }

  const aliases = new Set<string>()

  ;[
    ...ENGLISH_UNIVERSITY_GATE_PATTERNS,
    ...PINYIN_UNIVERSITY_GATE_PATTERNS,
    ...CHINESE_UNIVERSITY_GATE_PATTERNS,
  ].forEach((pattern) => {
    const match = input.match(pattern)
    const base = match?.[1]
    if (base) {
      addBaseAndInstitutionlessAliases(aliases, base, input)
    }
  })

  if (
    ENGLISH_INSTITUTION_SUFFIX_PATTERN.test(input) ||
    PINYIN_INSTITUTION_SUFFIX_PATTERN.test(input) ||
    CHINESE_INSTITUTION_SUFFIX_PATTERN.test(input)
  ) {
    addBaseAndInstitutionlessAliases(aliases, input, input)
  }

  return Array.from(aliases)
}
