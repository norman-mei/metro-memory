import { formatLocalizedCityName } from '@/lib/cityNameDisplay'
import { CITY_PATH_MAP } from '@/lib/cityPathMap'

const EXACT_SIMPLIFIED_TITLES: Record<string, string> = {
  'Additional Lines': '\u9644\u52a0\u7ebf\u8def',
  'Line Group': '\u7ebf\u8def\u7ec4',
  Lines: '\u7ebf\u8def',
  'Custom Layout': '\u81ea\u5b9a\u4e49\u5e03\u5c40',
  'Create Custom Layout': '\u521b\u5efa\u81ea\u5b9a\u4e49\u5e03\u5c40',
  'Build a subset from the current city or mini city while keeping the original headers, subheaders, and progress scope.':
    '\u4ece\u5f53\u524d\u57ce\u5e02\u6216\u8ff7\u4f60\u57ce\u5e02\u4e2d\u6784\u5efa\u5b50\u96c6\uff0c\u540c\u65f6\u4fdd\u7559\u539f\u59cb\u6807\u9898\u3001\u5b50\u6807\u9898\u548c\u8fdb\u5ea6\u7edf\u8ba1\u8303\u56f4\u3002',
  'Custom Title': '\u81ea\u5b9a\u4e49\u6807\u9898',
  'Search Lines': '\u641c\u7d22\u7ebf\u8def',
  'Select Lines to Include': '\u9009\u62e9\u8981\u5305\u542b\u7684\u7ebf\u8def',
  'Mass Transit Railway (MTR)': '\u6e2f\u94c1\uff08MTR\uff09',
  'Mass Transit Railway (Heavy Rail)': '\u6e2f\u94c1\uff08\u91cd\u94c1\uff09',
  'Mass Transit Railway (Light Rail)': '\u6e2f\u94c1\uff08\u8f7b\u94c1\uff09',
  'Guangzhou Metro': '\u5e7f\u5dde\u5730\u94c1',
  'Guangzhou Tram': '\u5e7f\u5dde\u6709\u8f68\u7535\u8f66',
  'Guangzhou Trams': '\u5e7f\u5dde\u6709\u8f68\u7535\u8f66',
  'Foshan Metro': '\u4f5b\u5c71\u5730\u94c1',
  'Shenzhen Metro': '\u6df1\u5733\u5730\u94c1',
  'Shenzhen Trams': '\u6df1\u5733\u6709\u8f68\u7535\u8f66',
  BYD: '\u6bd4\u4e9a\u8fea',
  'Dongguan Rail Transit': '\u4e1c\u839e\u8f68\u9053\u4ea4\u901a',
  'Shenzhen Airport Co., Ltd.': '\u6df1\u5733\u673a\u573a',
  'RATP Dev Transdev Asia': '\u6cd5\u5df4\u4f20\u5bcc\u4e9a\u6d32',
  'Hongkong and Shanghai Hotels (HSH)': '\u9999\u6e2f\u4e0a\u6d77\u5927\u9152\u5e97\uff08HSH\uff09',
  'Ocean Park Corporation (OPC)': '\u6d77\u6d0b\u516c\u56ed\u516c\u53f8\uff08OPC\uff09',
  'Hong Kong International Airport Automated People Mover (APM)':
    '\u9999\u6e2f\u56fd\u9645\u673a\u573a\u81ea\u52a8\u65c5\u5ba2\u8fd0\u9001\u7cfb\u7edf\uff08APM\uff09',
  'Macao Light Rapid Transit (Macao LRT)':
    '\u6fb3\u95e8\u8f7b\u8f68\uff08\u6fb3\u95e8LRT\uff09',
  'Wynn Resorts Limited': '\u6c38\u5229\u5ea6\u5047\u6751',
  'Municipal Affairs Bureau': '\u5e02\u653f\u7f72',
  'Ngong Ping 360': '\u6602\u576a360',
  'Intercity Rail': '\u57ce\u9645\u94c1\u8def',
  'Qingyuan Maglev Transportation Co., Ltd': '\u6e05\u8fdc\u78c1\u6d6e\u4ea4\u901a\u6709\u9650\u516c\u53f8',
  'Guangzhou Chimelong Safari Park': '\u5e7f\u5dde\u957f\u9686\u91ce\u751f\u52a8\u7269\u4e16\u754c',
  'Baiyun Mountain Cableway': '\u767d\u4e91\u5c71\u7d22\u9053',
  'Heavy Rail': '\u91cd\u94c1',
  'Light Rail': '\u8f7b\u94c1',
}

const EXACT_TRADITIONAL_TITLES: Record<string, string> = {
  'Additional Lines': '\u9644\u52a0\u7dda\u8def',
  'Line Group': '\u7dda\u8def\u7d44',
  Lines: '\u7dda\u8def',
  'Custom Layout': '\u81ea\u8a02\u5e03\u5c40',
  'Create Custom Layout': '\u5efa\u7acb\u81ea\u8a02\u5e03\u5c40',
  'Build a subset from the current city or mini city while keeping the original headers, subheaders, and progress scope.':
    '\u5f9e\u7576\u524d\u57ce\u5e02\u6216\u8ff7\u4f60\u57ce\u5e02\u4e2d\u5efa\u7acb\u5b50\u96c6\uff0c\u540c\u6642\u4fdd\u7559\u539f\u59cb\u6a19\u984c\u3001\u5b50\u6a19\u984c\u548c\u9032\u5ea6\u7d71\u8a08\u7bc4\u570d\u3002',
  'Custom Title': '\u81ea\u8a02\u6a19\u984c',
  'Search Lines': '\u641c\u5c0b\u7dda\u8def',
  'Select Lines to Include': '\u9078\u64c7\u8981\u5305\u542b\u7684\u7dda\u8def',
  'Mass Transit Railway (MTR)': '\u6e2f\u9435\uff08MTR\uff09',
  'Mass Transit Railway (Heavy Rail)': '\u6e2f\u9435\uff08\u91cd\u9435\uff09',
  'Mass Transit Railway (Light Rail)': '\u6e2f\u9435\uff08\u8f15\u9435\uff09',
  'Guangzhou Metro': '\u5ee3\u5dde\u5730\u9435',
  'Guangzhou Tram': '\u5ee3\u5dde\u6709\u8ecc\u96fb\u8eca',
  'Guangzhou Trams': '\u5ee3\u5dde\u6709\u8ecc\u96fb\u8eca',
  'Foshan Metro': '\u4f5b\u5c71\u5730\u9435',
  'Shenzhen Metro': '\u6df1\u5733\u5730\u9435',
  'Shenzhen Trams': '\u6df1\u5733\u6709\u8ecc\u96fb\u8eca',
  BYD: '\u6bd4\u4e9e\u8fea',
  'Dongguan Rail Transit': '\u6771\u839e\u8ecc\u9053\u4ea4\u901a',
  'Shenzhen Airport Co., Ltd.': '\u6df1\u5733\u6a5f\u5834',
  'RATP Dev Transdev Asia': '\u6cd5\u5df4\u50b3\u5bcc\u4e9e\u6d32',
  'Hongkong and Shanghai Hotels (HSH)': '\u9999\u6e2f\u4e0a\u6d77\u5927\u9152\u5e97\uff08HSH\uff09',
  'Ocean Park Corporation (OPC)': '\u6d77\u6d0b\u516c\u5712\u516c\u53f8\uff08OPC\uff09',
  'Hong Kong International Airport Automated People Mover (APM)':
    '\u9999\u6e2f\u570b\u969b\u6a5f\u5834\u81ea\u52d5\u65c5\u5ba2\u904b\u9001\u7cfb\u7d71\uff08APM\uff09',
  'Macao Light Rapid Transit (Macao LRT)':
    '\u6fb3\u9580\u8f15\u8ecc\uff08\u6fb3\u9580LRT\uff09',
  'Wynn Resorts Limited': '\u6c38\u5229\u5ea6\u5047\u6751',
  'Municipal Affairs Bureau': '\u5e02\u653f\u7f72',
  'Ngong Ping 360': '\u6602\u576a360',
  'Intercity Rail': '\u57ce\u969b\u9435\u8def',
  'Qingyuan Maglev Transportation Co., Ltd': '\u6e05\u9060\u78c1\u6d6e\u4ea4\u901a\u6709\u9650\u516c\u53f8',
  'Guangzhou Chimelong Safari Park': '\u5ee3\u5dde\u9577\u9686\u91ce\u751f\u52d5\u7269\u4e16\u754c',
  'Baiyun Mountain Cableway': '\u767d\u96f2\u5c71\u7d22\u9053',
  'Heavy Rail': '\u91cd\u9435',
  'Light Rail': '\u8f15\u9435',
}

const EXACT_SIMPLIFIED_BASE_NAMES: Record<string, string> = {
  'Greater Bay Area': '\u7ca4\u6e2f\u6fb3\u5927\u6e7e\u533a',
  Guangzhou: '\u5e7f\u5dde',
  Foshan: '\u4f5b\u5c71',
  Shenzhen: '\u6df1\u5733',
  Dongguan: '\u4e1c\u839e',
  'Hong Kong': '\u9999\u6e2f',
  Macau: '\u6fb3\u95e8',
  Nanning: '\u5357\u5b81',
}

const EXACT_TRADITIONAL_BASE_NAMES: Record<string, string> = {
  'Greater Bay Area': '\u7cb5\u6e2f\u6fb3\u5927\u7063\u5340',
  Guangzhou: '\u5ee3\u5dde',
  Foshan: '\u4f5b\u5c71',
  Shenzhen: '\u6df1\u5733',
  Dongguan: '\u6771\u839e',
  'Hong Kong': '\u9999\u6e2f',
  Macau: '\u6fb3\u9580',
  Nanning: '\u5357\u5be7',
}

const TITLE_PATTERN_TRANSLATIONS = [
  {
    pattern: /^(.+?)\s+Metro\s+and\s+Trams?(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u5730\u94c1\u4e0e\u6709\u8f68\u7535\u8f66',
    traditionalSuffix: '\u5730\u9435\u8207\u6709\u8ecc\u96fb\u8eca',
  },
  {
    pattern: /^(.+?)\s+Metro\s+and\s+Tram(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u5730\u94c1\u4e0e\u6709\u8f68\u7535\u8f66',
    traditionalSuffix: '\u5730\u9435\u8207\u6709\u8ecc\u96fb\u8eca',
  },
  {
    pattern: /^(.+?)\s+Rail\s+Transit(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u8f68\u9053\u4ea4\u901a',
    traditionalSuffix: '\u8ecc\u9053\u4ea4\u901a',
  },
  {
    pattern: /^(.+?)\s+Metro(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u5730\u94c1',
    traditionalSuffix: '\u5730\u9435',
  },
  {
    pattern: /^(.+?)\s+Subway(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u5730\u94c1',
    traditionalSuffix: '\u5730\u9435',
  },
  {
    pattern: /^(.+?)\s+Modern\s+Trams?(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u73b0\u4ee3\u6709\u8f68\u7535\u8f66',
    traditionalSuffix: '\u73fe\u4ee3\u6709\u8ecc\u96fb\u8eca',
  },
  {
    pattern: /^(.+?)\s+Trams?(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u6709\u8f68\u7535\u8f66',
    traditionalSuffix: '\u6709\u8ecc\u96fb\u8eca',
  },
  {
    pattern: /^(.+?)\s+Intercity\s+Rail(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u57ce\u9645\u94c1\u8def',
    traditionalSuffix: '\u57ce\u969b\u9435\u8def',
  },
  {
    pattern: /^(.+?)\s+Light\s+Rail(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u8f7b\u8f68',
    traditionalSuffix: '\u8f15\u8ecc',
  },
  {
    pattern: /^(.+?)\s+Heavy\s+Rail(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u91cd\u94c1',
    traditionalSuffix: '\u91cd\u9435',
  },
  {
    pattern: /^(.+?)\s+Tourism\s+Monorail(\s+\([^)]*\))?$/i,
    simplifiedSuffix: '\u65c5\u6e38\u5355\u8f68',
    traditionalSuffix: '\u65c5\u904a\u55ae\u8ecc',
  },
]

const cleanTitle = (value: string) =>
  value.replace(/\s+/g, ' ').trim()

const isChineseLanguage = (language?: string | null) =>
  language === 'zh-CN' || language === 'zh-TW'

const isChinaSlug = (slugOrLink?: string | null) => {
  if (!slugOrLink) {
    return false
  }

  const normalized = slugOrLink.replace(/^\//, '').split(/[?#]/)[0]
  const path = CITY_PATH_MAP[normalized] ?? normalized
  return path.startsWith('asia/china/')
}

const extractCoreCityName = (name: string) =>
  name.split(/\s*[,\uff0c]\s*/)[0]?.trim() ?? name

const preserveParenthetical = (suffix: string) =>
  suffix
    ? suffix
        .trim()
        .replace(/\(/g, '\uff08')
        .replace(/\)/g, '\uff09')
    : ''

const localizeBaseTitleName = (
  value: string,
  slugOrLink: string | null | undefined,
  language: 'zh-CN' | 'zh-TW',
) => {
  const cleaned = cleanTitle(value)
  const exactBaseMap =
    language === 'zh-TW'
      ? EXACT_TRADITIONAL_BASE_NAMES
      : EXACT_SIMPLIFIED_BASE_NAMES

  if (exactBaseMap[cleaned]) {
    return exactBaseMap[cleaned]
  }

  return extractCoreCityName(
    formatLocalizedCityName(cleaned, slugOrLink ?? '', language),
  )
}

export const formatLocalizedChinaUiTitle = (
  value: string | undefined,
  slugOrLink: string | null | undefined,
  language?: string | null,
) => {
  const cleaned = cleanTitle(value ?? '')
  if (!cleaned || !isChineseLanguage(language) || !isChinaSlug(slugOrLink)) {
    return cleaned
  }
  const localizedLanguage = language as 'zh-CN' | 'zh-TW'

  const exactMap =
    localizedLanguage === 'zh-TW'
      ? EXACT_TRADITIONAL_TITLES
      : EXACT_SIMPLIFIED_TITLES
  if (exactMap[cleaned]) {
    return exactMap[cleaned]
  }

  for (const entry of TITLE_PATTERN_TRANSLATIONS) {
    const match = cleaned.match(entry.pattern)
    if (!match) {
      continue
    }

    const localizedBase = localizeBaseTitleName(
      match[1] ?? cleaned,
      slugOrLink,
      localizedLanguage,
    )
    const suffix =
      localizedLanguage === 'zh-TW'
        ? entry.traditionalSuffix
        : entry.simplifiedSuffix
    const parenthetical = preserveParenthetical(match[2] ?? '')
    return `${localizedBase}${suffix}${parenthetical}`
  }

  if (/Memory Game$/i.test(cleaned)) {
    const localizedBase = localizeBaseTitleName(
      cleaned.replace(/Memory Game$/i, '').trim(),
      slugOrLink,
      localizedLanguage,
    )
    return cleaned
      .replace(/Memory Game$/i, '')
      .trim()
      .replace(/^(.+)$/, `${localizedBase}\u8bb0\u5fc6\u6e38\u620f`)
      .replace(
        /\u8bb0\u5fc6\u6e38\u620f$/,
        localizedLanguage === 'zh-TW'
          ? '\u8a18\u61b6\u904a\u6232'
          : '\u8bb0\u5fc6\u6e38\u620f',
      )
  }

  return cleaned
}

export const formatLocalizedChinaUiDescription = (
  value: string | undefined,
  slugOrLink: string | null | undefined,
  language?: string | null,
) => {
  const cleaned = cleanTitle(value ?? '')
  if (!cleaned || !isChineseLanguage(language) || !isChinaSlug(slugOrLink)) {
    return cleaned
  }

  const localizedTitle = formatLocalizedChinaUiTitle(cleaned, slugOrLink, language)
  if (localizedTitle !== cleaned) {
    return localizedTitle
  }

  const localizedCity = formatLocalizedCityName(cleaned, slugOrLink ?? '', language)
  const simplifiedPattern =
    /^How many of the\s+(.+?)\s+stations can you name from memory\?$/i
  const match = cleaned.match(simplifiedPattern)
  if (match) {
    const localizedSystem = formatLocalizedChinaUiTitle(match[1], slugOrLink, language)
    if (language === 'zh-TW') {
      return `\u4f60\u80fd\u6191\u8a18\u61b6\u8aaa\u51fa${localizedSystem}\u7684\u591a\u5c11\u500b\u8eca\u7ad9\uff1f`
    }
    return `\u4f60\u80fd\u51ed\u8bb0\u5fc6\u8bf4\u51fa${localizedSystem}\u7684\u591a\u5c11\u4e2a\u8f66\u7ad9\uff1f`
  }

  if (cleaned === 'Map') {
    return language === 'zh-TW' ? '\u5730\u5716' : '\u5730\u56fe'
  }

  return localizedCity !== cleaned ? localizedCity : cleaned
}
