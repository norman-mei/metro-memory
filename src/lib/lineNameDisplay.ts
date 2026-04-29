const LINE_PREFIX_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^AirTrain JFK\s*[–-]\s*/i, ''],
  [/^AirTrain\s+/i, ''],
  [/^MNRR\s+/i, ''],
  [/^LIRR\s+/i, ''],
  [/^CTrail\s+/i, ''],
  [/^NJT\s+Light\s+Rail\s+/i, ''],
  [/^NJT\s+HBLR\s+/i, ''],
  [/^NJT\s+/i, ''],
]

const SIMPLIFIED_LINE_NAME_OVERRIDES: Record<string, string> = {
  'Mass Transit Railway (MTR)': '港铁（MTR）',
  'Heavy Rail': '重铁',
  'East Rail': '东铁线',
  'Tuen Ma': '屯马线',
  'Northern Link': '北环线',
  'Airport Express': '机场快线',
  'Disneyland Resort': '迪士尼线',
  'Disney Resort': '迪士尼线',
  'Island Line': '港岛线',
  'Island': '港岛线',
  'Kwun Tong Line': '观塘线',
  'Kwun Tong': '观塘线',
  'Tseung Kwan O Line': '将军澳线',
  'Tseung Kwan O': '将军澳线',
  'Tung Chung Line': '东涌线',
  'Tung Chung': '东涌线',
  'Tsuen Wan Line': '荃湾线',
  'Tsuen Wan': '荃湾线',
  'South Island Line': '南港岛线',
  'South Island': '南港岛线',
}

const TRADITIONAL_LINE_NAME_OVERRIDES: Record<string, string> = {
  'Mass Transit Railway (MTR)': '港鐵（MTR）',
  'Heavy Rail': '重鐵',
  'East Rail': '東鐵綫',
  'Tuen Ma': '屯馬綫',
  'Northern Link': '北環綫',
  'Airport Express': '機場快綫',
  'Disneyland Resort': '迪士尼綫',
  'Disney Resort': '迪士尼綫',
  'Island Line': '港島綫',
  'Island': '港島綫',
  'Kwun Tong Line': '觀塘綫',
  'Kwun Tong': '觀塘綫',
  'Tseung Kwan O Line': '將軍澳綫',
  'Tseung Kwan O': '將軍澳綫',
  'Tung Chung Line': '東涌綫',
  'Tung Chung': '東涌綫',
  'Tsuen Wan Line': '荃灣綫',
  'Tsuen Wan': '荃灣綫',
  'South Island Line': '南港島綫',
  'South Island': '南港島綫',
}

export const cleanupLineName = (name?: string) => {
  if (!name) return ''

  let result = name.replace(/L[Ii]ne/g, 'Line')

  for (const [pattern, replacement] of LINE_PREFIX_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }

  return result.replace(/^[–-]\s*/, '').replace(/\s{2,}/g, ' ').trim()
}

export const formatLocalizedLineName = (
  name: string | undefined,
  language?: string,
) => {
  const cleaned = cleanupLineName(name)
  if (!cleaned) {
    return ''
  }

  if (language === 'zh-CN') {
    if (SIMPLIFIED_LINE_NAME_OVERRIDES[cleaned]) {
      return SIMPLIFIED_LINE_NAME_OVERRIDES[cleaned]
    }
    return cleaned.replace(/^Line\s+(.+)$/i, '$1号线')
  }

  if (language === 'zh-TW') {
    if (TRADITIONAL_LINE_NAME_OVERRIDES[cleaned]) {
      return TRADITIONAL_LINE_NAME_OVERRIDES[cleaned]
    }
    return cleaned.replace(/^Line\s+(.+)$/i, '$1號線')
  }

  return cleaned
}
