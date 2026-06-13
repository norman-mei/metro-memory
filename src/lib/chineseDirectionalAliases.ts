type DirectionAlias = {
  english: string
  abbreviation: string
  pinyin: string
  chinese: string[]
}

const DIRECTION_ALIASES: DirectionAlias[] = [
  {
    english: 'Northeast',
    abbreviation: 'NE',
    pinyin: 'dongbei',
    chinese: ['东北', '東北'],
  },
  {
    english: 'Northwest',
    abbreviation: 'NW',
    pinyin: 'xibei',
    chinese: ['西北'],
  },
  {
    english: 'Southeast',
    abbreviation: 'SE',
    pinyin: 'dongnan',
    chinese: ['东南', '東南'],
  },
  {
    english: 'Southwest',
    abbreviation: 'SW',
    pinyin: 'xinan',
    chinese: ['西南'],
  },
  {
    english: 'North',
    abbreviation: 'N',
    pinyin: 'bei',
    chinese: ['北'],
  },
  {
    english: 'South',
    abbreviation: 'S',
    pinyin: 'nan',
    chinese: ['南'],
  },
  {
    english: 'East',
    abbreviation: 'E',
    pinyin: 'dong',
    chinese: ['东', '東'],
  },
  {
    english: 'West',
    abbreviation: 'W',
    pinyin: 'xi',
    chinese: ['西'],
  },
  {
    english: 'Inner',
    abbreviation: 'In',
    pinyin: 'nei',
    chinese: ['内', '內'],
  },
  {
    english: 'Outer',
    abbreviation: 'Out',
    pinyin: 'wai',
    chinese: ['外'],
  },
]

const addAlias = (aliases: Set<string>, value: string, original: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.toLowerCase() === original.toLowerCase()) {
    return
  }
  aliases.add(normalized)
}

const addReplacedTokenAliases = (
  aliases: Set<string>,
  input: string,
  pattern: RegExp,
  replacements: string[],
) => {
  pattern.lastIndex = 0
  replacements.forEach((replacement) => {
    pattern.lastIndex = 0
    addAlias(aliases, input.replace(pattern, replacement), input)
  })

  pattern.lastIndex = 0
  const matches = Array.from(input.matchAll(pattern))
  matches.forEach((match) => {
    const matchIndex = match.index
    if (typeof matchIndex !== 'number') {
      return
    }
    replacements.forEach((replacement) => {
      addAlias(
        aliases,
        `${input.slice(0, matchIndex)}${replacement}${input.slice(
          matchIndex + match[0].length,
        )}`,
        input,
      )
    })
  })
}

const addReplacedTextAliases = (
  aliases: Set<string>,
  input: string,
  search: string,
  replacements: string[],
) => {
  replacements.forEach((replacement) => {
    addAlias(aliases, input.replaceAll(search, replacement), input)
  })

  let startIndex = 0
  while (startIndex < input.length) {
    const matchIndex = input.indexOf(search, startIndex)
    if (matchIndex === -1) {
      break
    }
    replacements.forEach((replacement) => {
      addAlias(
        aliases,
        `${input.slice(0, matchIndex)}${replacement}${input.slice(
          matchIndex + search.length,
        )}`,
        input,
      )
    })
    startIndex = matchIndex + search.length
  }
}

const replaceLatinDirectionTokens = (
  input: string,
  aliases: Set<string>,
  direction: DirectionAlias,
) => {
  const englishPattern = new RegExp(`\\b${direction.english}\\b`, 'gi')
  const abbreviationPattern = new RegExp(`\\b${direction.abbreviation}\\b`, 'gi')
  const spacedPinyin = direction.pinyin.replace(/([a-z]+)(bei|nan)$/i, '$1 $2')
  const pinyinPatterns = Array.from(
    new Set([direction.pinyin, spacedPinyin].filter(Boolean)),
  ).map((value) => new RegExp(`\\b${value}\\b`, 'gi'))

  if (englishPattern.test(input)) {
    addReplacedTokenAliases(aliases, input, englishPattern, [
      direction.abbreviation,
      direction.pinyin,
    ])
  }

  if (abbreviationPattern.test(input)) {
    addReplacedTokenAliases(aliases, input, abbreviationPattern, [
      direction.english,
      direction.pinyin,
    ])
  }

  pinyinPatterns.forEach((pattern) => {
    if (!pattern.test(input)) {
      return
    }
    addReplacedTokenAliases(aliases, input, pattern, [
      direction.english,
      direction.abbreviation,
    ])
  })
}

const replaceChineseDirectionCharacters = (
  input: string,
  aliases: Set<string>,
  direction: DirectionAlias,
) => {
  direction.chinese.forEach((chinese) => {
    if (!input.includes(chinese)) {
      return
    }
    addReplacedTextAliases(aliases, input, chinese, [
      direction.english,
      direction.abbreviation,
      direction.pinyin,
    ])
  })
}

export const generateChineseDirectionalAlternates = (
  value?: string | null,
): string[] => {
  const input = (value ?? '').trim()
  if (!input) {
    return []
  }

  const aliases = new Set<string>()
  DIRECTION_ALIASES.forEach((direction) => {
    replaceLatinDirectionTokens(input, aliases, direction)
    replaceChineseDirectionCharacters(input, aliases, direction)
  })

  return Array.from(aliases)
}
