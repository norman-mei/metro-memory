import { repairMojibakeString } from './repairMojibake.ts'

type StationNameRule = {
  chineseSuffixes: string[]
  excludedChineseSuffixes?: string[]
  latinSuffixes: string[]
  replacement: string
  compactMode?: 'suffix' | 'whole'
  compactOnly?: boolean
}

type DirectionTerm = {
  english: string
  pinyin: string
  chinese: string[]
}

type PostpositiveTerm = {
  english: string
  pinyin: string[]
  chinese: string[]
  allowDirectionBeforeTermPostpositive?: boolean
  allowDirectionBeforeTermPrepositive?: boolean
  allowCompactDirectionBefore?: boolean
  allowEmbeddedBaseSuffix?: boolean
}

type PhraseRule = {
  chineseIncludes: string[]
  patterns: RegExp[]
  replacement: string
}

const POSTPOSITIVE_DIRECTIONS: DirectionTerm[] = [
  { english: 'North', pinyin: 'bei', chinese: ['北'] },
  { english: 'South', pinyin: 'nan', chinese: ['南'] },
  { english: 'East', pinyin: 'dong', chinese: ['东', '東'] },
  { english: 'West', pinyin: 'xi', chinese: ['西'] },
  { english: 'Inner', pinyin: 'nei', chinese: ['内', '內'] },
  { english: 'Outer', pinyin: 'wai', chinese: ['外'] },
]

const POSTPOSITIVE_TERMS: PostpositiveTerm[] = [
  {
    english: 'Gate',
    pinyin: ['men'],
    chinese: ['门', '門'],
    allowDirectionBeforeTermPostpositive: true,
  },
  {
    english: 'Street',
    pinyin: ['jie'],
    chinese: ['街'],
    allowDirectionBeforeTermPostpositive: true,
    allowCompactDirectionBefore: true,
  },
  {
    english: 'Road',
    pinyin: ['lu'],
    chinese: ['路'],
    allowCompactDirectionBefore: true,
  },
  {
    english: 'Avenue',
    pinyin: ['da jie', 'dajie', 'da dao', 'dadao'],
    chinese: ['大街', '大道', '大路'],
    allowCompactDirectionBefore: true,
  },
  {
    english: 'Square',
    pinyin: ['guang chang', 'guangchang'],
    chinese: ['广场', '廣場'],
  },
  {
    english: 'Park',
    pinyin: ['gong yuan', 'gongyuan'],
    chinese: ['公园', '公園'],
    allowEmbeddedBaseSuffix: true,
  },
  {
    english: 'Campus',
    pinyin: ['xiao qu', 'xiaoqu'],
    chinese: ['校区', '校區'],
  },
  {
    english: 'Bridge',
    pinyin: ['qiao'],
    chinese: ['桥', '橋'],
    allowDirectionBeforeTermPrepositive: true,
    allowCompactDirectionBefore: true,
    allowEmbeddedBaseSuffix: true,
  },
  {
    english: 'Mountain',
    pinyin: ['shan'],
    chinese: ['山'],
  },
  {
    english: 'Lane',
    pinyin: ['li'],
    chinese: ['里', '裡'],
  },
  {
    english: 'Bay',
    pinyin: ['wan'],
    chinese: ['湾', '灣'],
  },
  {
    english: 'City',
    pinyin: ['cheng'],
    chinese: ['城'],
    allowEmbeddedBaseSuffix: true,
  },
]

const PHRASE_RULES: PhraseRule[] = [
  {
    chineseIncludes: ['奥林匹克公园', '奧林匹克公園'],
    patterns: [
      /\baolinpike\s+(?:gong\s*yuan|park)\b/i,
      /\baolinpikegongyuan\b/i,
      /\bolympic\s+gong\s*yuan\b/i,
    ],
    replacement: 'Olympic Park',
  },
]

const DIRECTIONAL_SUFFIX_RULES: StationNameRule[] = [
  {
    chineseSuffixes: ['东路', '東路'],
    latinSuffixes: ['dong lu', 'donglu'],
    replacement: 'East Road',
  },
  {
    chineseSuffixes: ['西路'],
    latinSuffixes: ['xi lu', 'xilu'],
    replacement: 'West Road',
  },
  {
    chineseSuffixes: ['南路'],
    latinSuffixes: ['nan lu', 'nanlu'],
    replacement: 'South Road',
  },
  {
    chineseSuffixes: ['北路'],
    latinSuffixes: ['bei lu', 'beilu'],
    replacement: 'North Road',
  },
  {
    chineseSuffixes: ['中路'],
    latinSuffixes: ['zhong lu', 'zhonglu'],
    replacement: 'Middle Road',
  },
  {
    chineseSuffixes: ['东门', '東門'],
    latinSuffixes: ['dong men', 'dongmen'],
    replacement: 'East Gate',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['西门', '西門'],
    latinSuffixes: ['xi men', 'ximen'],
    replacement: 'West Gate',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['南门', '南門'],
    latinSuffixes: ['nan men', 'nanmen'],
    replacement: 'South Gate',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['北门', '北門'],
    latinSuffixes: ['bei men', 'beimen'],
    replacement: 'North Gate',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['东大街', '東大街'],
    latinSuffixes: ['dong da jie', 'dong dajie', 'dongdajie'],
    replacement: 'East Avenue',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['西大街'],
    latinSuffixes: ['xi da jie', 'xi dajie', 'xidajie'],
    replacement: 'West Avenue',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['南大街'],
    latinSuffixes: ['nan da jie', 'nan dajie', 'nandajie'],
    replacement: 'South Avenue',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['北大街'],
    latinSuffixes: ['bei da jie', 'bei dajie', 'beidajie'],
    replacement: 'North Avenue',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['东广场', '東廣場', '东广場', '東广场'],
    latinSuffixes: ['dong guang chang', 'dong guangchang', 'dongguangchang'],
    replacement: 'East Square',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['西广场', '西廣場'],
    latinSuffixes: ['xi guang chang', 'xi guangchang', 'xiguangchang'],
    replacement: 'West Square',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['南广场', '南廣場'],
    latinSuffixes: ['nan guang chang', 'nan guangchang', 'nanguangchang'],
    replacement: 'South Square',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['北广场', '北廣場'],
    latinSuffixes: ['bei guang chang', 'bei guangchang', 'beiguangchang'],
    replacement: 'North Square',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['东校区', '東校區', '东校區', '東校区'],
    latinSuffixes: ['dong xiao qu', 'dong xiaoqu', 'dongxiaoqu'],
    replacement: 'East Campus',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['西校区', '西校區'],
    latinSuffixes: ['xi xiao qu', 'xi xiaoqu', 'xixiaoqu'],
    replacement: 'West Campus',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['南校区', '南校區'],
    latinSuffixes: ['nan xiao qu', 'nan xiaoqu', 'nanxiaoqu'],
    replacement: 'South Campus',
    compactMode: 'whole',
  },
  {
    chineseSuffixes: ['北校区', '北校區'],
    latinSuffixes: ['bei xiao qu', 'bei xiaoqu', 'beixiaoqu'],
    replacement: 'North Campus',
    compactMode: 'whole',
  },
]

const STATION_NAME_RULES: StationNameRule[] = [
  {
    chineseSuffixes: ['火车站', '火車站'],
    latinSuffixes: ['huo che zhan', 'huoche zhan', 'huo chezhan', 'huochezhan'],
    replacement: 'Railway Station',
  },
  {
    chineseSuffixes: ['高铁站', '高鐵站'],
    latinSuffixes: ['gao tie zhan', 'gaotiezhan'],
    replacement: 'High-Speed Railway Station',
  },
  {
    chineseSuffixes: ['铁路站', '鐵路站'],
    latinSuffixes: ['tie lu zhan', 'tieluzhan'],
    replacement: 'Railway Station',
  },
  {
    chineseSuffixes: ['航站楼', '航站樓'],
    latinSuffixes: ['hang zhan lou', 'hangzhanlou'],
    replacement: 'Terminal',
  },
  {
    chineseSuffixes: ['会展中心', '會展中心'],
    latinSuffixes: ['hui zhan zhong xin', 'huizhanzhongxin'],
    replacement: 'Exhibition Center',
  },
  {
    chineseSuffixes: ['展览中心', '展覽中心'],
    latinSuffixes: ['zhan lan zhong xin', 'zhanlan zhongxin', 'zhanlanzhongxin'],
    replacement: 'Exhibition Center',
  },
  {
    chineseSuffixes: ['展览馆', '展覽館'],
    latinSuffixes: ['zhan lan guan', 'zhanlanguan'],
    replacement: 'Exhibition Hall',
  },
  {
    chineseSuffixes: ['图书馆', '圖書館'],
    latinSuffixes: ['tu shu guan', 'tushuguan'],
    replacement: 'Library',
  },
  {
    chineseSuffixes: ['商城', '商場'],
    latinSuffixes: ['shang cheng', 'shangcheng', 'shang chang', 'shangchang'],
    replacement: 'Mall',
  },
  {
    chineseSuffixes: ['古城'],
    latinSuffixes: ['gu cheng', 'gucheng'],
    replacement: 'Ancient City',
  },
  {
    chineseSuffixes: ['城'],
    latinSuffixes: ['cheng'],
    replacement: 'City',
  },
  ...DIRECTIONAL_SUFFIX_RULES,
  {
    chineseSuffixes: ['大道', '大路'],
    latinSuffixes: ['da dao', 'dadao', 'da lu', 'dalu'],
    replacement: 'Avenue',
  },
  {
    chineseSuffixes: ['大街'],
    latinSuffixes: ['da jie', 'dajie'],
    replacement: 'Avenue',
  },
  {
    chineseSuffixes: ['公园', '公園'],
    latinSuffixes: ['gong yuan', 'gongyuan'],
    replacement: 'Park',
  },
  {
    chineseSuffixes: ['广场', '廣場'],
    latinSuffixes: ['guang chang', 'guangchang'],
    replacement: 'Square',
  },
  {
    chineseSuffixes: ['商场', '商場'],
    latinSuffixes: ['shang chang', 'shangchang'],
    replacement: 'Mall',
  },
  {
    chineseSuffixes: ['机场', '機場'],
    latinSuffixes: ['ji chang', 'jichang'],
    replacement: 'Airport',
  },
  {
    chineseSuffixes: ['大学', '大學'],
    latinSuffixes: ['da xue', 'daxue'],
    replacement: 'University',
  },
  {
    chineseSuffixes: ['学院', '學院'],
    latinSuffixes: ['xue yuan', 'xueyuan'],
    replacement: 'College',
  },
  {
    chineseSuffixes: ['校区', '校區'],
    latinSuffixes: ['xiao qu', 'xiaoqu'],
    replacement: 'Campus',
  },
  {
    chineseSuffixes: ['中心'],
    latinSuffixes: ['zhong xin', 'zhongxin'],
    replacement: 'Center',
  },
  {
    chineseSuffixes: ['山'],
    latinSuffixes: ['shan'],
    replacement: 'Mountain',
    compactOnly: true,
  },
  {
    chineseSuffixes: ['里', '裡'],
    latinSuffixes: ['li'],
    replacement: 'Lane',
  },
  {
    chineseSuffixes: ['湾', '灣'],
    latinSuffixes: ['wan'],
    replacement: 'Bay',
    compactOnly: true,
  },
  {
    chineseSuffixes: ['桥', '橋'],
    latinSuffixes: ['qiao'],
    replacement: 'Bridge',
  },
  {
    chineseSuffixes: ['路'],
    latinSuffixes: ['lu'],
    replacement: 'Road',
  },
  {
    chineseSuffixes: ['街'],
    latinSuffixes: ['jie'],
    replacement: 'Street',
  },
  {
    chineseSuffixes: ['门', '門'],
    latinSuffixes: ['men'],
    replacement: 'Gate',
  },
]

const DIRECTION_ONLY_STATION_RULES: StationNameRule[] = [
  {
    chineseSuffixes: ['东火车站', '東火車站', '东站', '東站'],
    excludedChineseSuffixes: ['汽车东站', '汽車東站'],
    latinSuffixes: [
      'huo che dong zhan',
      'huochedongzhan',
      'dong huo che zhan',
      'donghuochezhan',
      'dong zhan',
      'dongzhan',
    ],
    replacement: 'East Railway Station',
  },
  {
    chineseSuffixes: ['西火车站', '西火車站', '西站'],
    excludedChineseSuffixes: ['汽车西站', '汽車西站'],
    latinSuffixes: [
      'huo che xi zhan',
      'huochexizhan',
      'xi huo che zhan',
      'xihuochezhan',
      'xi zhan',
      'xizhan',
    ],
    replacement: 'West Railway Station',
  },
  {
    chineseSuffixes: ['南火车站', '南火車站', '南站'],
    excludedChineseSuffixes: ['汽车南站', '汽車南站'],
    latinSuffixes: [
      'huo che nan zhan',
      'huochenanzhan',
      'nan huo che zhan',
      'nanhuochezhan',
      'nan zhan',
      'nanzhan',
    ],
    replacement: 'South Railway Station',
  },
  {
    chineseSuffixes: ['北火车站', '北火車站', '北站'],
    excludedChineseSuffixes: ['汽车北站', '汽車北站'],
    latinSuffixes: [
      'huo che bei zhan',
      'huochebeizhan',
      'bei huo che zhan',
      'beihuochezhan',
      'bei zhan',
      'beizhan',
    ],
    replacement: 'North Railway Station',
  },
]

const CJK_PARENTHESES_RE = /([（(])([^()（）]*[\u3400-\u9fff][^()（）]*)([)）])/

const extractChineseContext = (value: string) => {
  const repaired = repairMojibakeString(value)
  const parenthetical = repaired.match(CJK_PARENTHESES_RE)?.[2]
  if (parenthetical) {
    return parenthetical
  }
  return (repaired.match(/[\u3400-\u9fff]+/g) ?? []).join('')
}

const hasChineseSuffix = (chineseContext: string, suffixes: string[]) =>
  suffixes.some((suffix) => chineseContext.endsWith(suffix))

const hasExcludedChineseSuffix = (chineseContext: string, suffixes?: string[]) =>
  Boolean(suffixes?.some((suffix) => chineseContext.endsWith(suffix)))

const hasChineseEnding = (
  chineseContext: string,
  leftTerms: string[],
  rightTerms: string[],
) =>
  leftTerms.some((left) =>
    rightTerms.some((right) => chineseContext.endsWith(`${left}${right}`)),
  )

const replaceLatinSuffix = (
  value: string,
  latinSuffixes: string[],
  replacement: string,
  compactMode: StationNameRule['compactMode'] = 'suffix',
  compactOnly = false,
) => {
  let output = value

  latinSuffixes.forEach((suffix) => {
    const spacedSuffix = suffix.replace(/\s+/g, '\\s+')
    if (compactMode === 'whole' && !/\s/.test(suffix)) {
      const standaloneCompactPattern = new RegExp(`(^|\\s)${spacedSuffix}$`, 'i')
      output = output.replace(standaloneCompactPattern, (_match, prefix: string) =>
        `${prefix}${replacement}`,
      )
    } else if (!compactOnly) {
      const wordPattern = new RegExp(`\\b${spacedSuffix}$`, 'i')
      output = output.replace(wordPattern, replacement)
    }

    const compactSuffix = suffix.replace(/\s+/g, '')
    if (compactSuffix.length >= 2) {
      if (compactMode === 'whole') {
        const wholeCompactPattern = new RegExp(`^${compactSuffix}$`, 'i')
        output = output.replace(wholeCompactPattern, replacement)
        return
      }

      if (output.toLowerCase().endsWith(compactSuffix.toLowerCase())) {
        const stem = output.slice(0, -compactSuffix.length)
        if (/[A-Za-z]$/.test(stem)) {
          output = `${stem} ${replacement}`
        }
      }
    }
  })

  return output
}

const applyPhraseRules = (latinName: string, chineseContext: string) => {
  let output = latinName

  PHRASE_RULES.forEach((rule) => {
    if (
      !rule.chineseIncludes.some((chineseText) => chineseContext.includes(chineseText))
    ) {
      return
    }

    rule.patterns.forEach((pattern) => {
      output = output.replace(pattern, rule.replacement)
    })
  })

  return output
}

const normalizeTermForPostpositiveDirection = (
  value: string,
  term: PostpositiveTerm,
) => {
  let output = value
  const sourceTerms = [term.english, ...term.pinyin]

  sourceTerms.forEach((sourceTerm) => {
    const spacedSource = sourceTerm.replace(/\s+/g, '\\s+')
    const sourcePattern = new RegExp(`\\b${spacedSource}\\b`, 'i')
    output = output.replace(sourcePattern, term.english)
  })

  return output
}

const normalizeEmbeddedTermSuffix = (value: string, chineseContext: string) => {
  let output = value

  POSTPOSITIVE_TERMS.forEach((term) => {
    if (!term.allowEmbeddedBaseSuffix) {
      return
    }
    if (!term.chinese.some((chineseTerm) => chineseContext.includes(chineseTerm))) {
      return
    }

    output = normalizeTermForPostpositiveDirection(output, term)

    term.pinyin
      .map((termValue) => termValue.replace(/\s+/g, ''))
      .filter((termValue) => termValue.length > 1)
      .forEach((compactTerm) => {
        if (!output.toLowerCase().endsWith(compactTerm.toLowerCase())) {
          return
        }
        const stem = output.slice(0, -compactTerm.length)
        if (/[A-Za-z]$/.test(stem)) {
          output = `${stem} ${term.english}`
        }
      })
  })

  return output
}

const applyPostpositiveDirectionalRules = (
  latinName: string,
  chineseContext: string,
) => {
  let output = latinName

  POSTPOSITIVE_DIRECTIONS.forEach((direction) => {
    POSTPOSITIVE_TERMS.forEach((term) => {
      const chineseDirectionBeforeTerm = hasChineseEnding(
        chineseContext,
        direction.chinese,
        term.chinese,
      )
      const chineseTermBeforeDirection = hasChineseEnding(
        chineseContext,
        term.chinese,
        direction.chinese,
      )

      if (!chineseDirectionBeforeTerm && !chineseTermBeforeDirection) {
        return
      }

      const termAlternatives = [term.english, ...term.pinyin]
        .map((termValue) => termValue.replace(/\s+/g, '\\s+'))
        .join('|')

      if (
        chineseDirectionBeforeTerm &&
        (term.allowDirectionBeforeTermPostpositive ||
          term.allowDirectionBeforeTermPrepositive)
      ) {
        const replaceDirectionBeforeTerm = (base: string, rawTerm: string) => {
          const normalizedBase = normalizeEmbeddedTermSuffix(
            base.trim(),
            chineseContext,
          )
          const normalizedTerm = normalizeTermForPostpositiveDirection(
            rawTerm,
            term,
          )
          if (term.allowDirectionBeforeTermPrepositive) {
            return `${normalizedBase} ${direction.english} ${normalizedTerm}`
          }
          return `${normalizedBase} ${normalizedTerm} ${direction.english}`
        }

        const spacedDirectionBeforeTermPattern = new RegExp(
          `^(.+?)\\s+${direction.pinyin}\\s+(${termAlternatives})$`,
          'i',
        )
        output = output.replace(
          spacedDirectionBeforeTermPattern,
          (_match, base: string, rawTerm: string) =>
            replaceDirectionBeforeTerm(base, rawTerm),
        )

        if (term.allowCompactDirectionBefore) {
          term.pinyin
            .map((termValue) => termValue.replace(/\s+/g, ''))
            .filter((termValue) => termValue.length > 1)
            .forEach((compactTerm) => {
              const compactDirectionBeforeTermPattern = new RegExp(
                `^(.{3,})${direction.pinyin}${compactTerm}$`,
                'i',
              )
              output = output.replace(
                compactDirectionBeforeTermPattern,
                (_match, base: string) =>
                  replaceDirectionBeforeTerm(base, term.english),
              )
            })
        }
      }

      if (chineseTermBeforeDirection) {
        const spacedTermBeforeDirectionPattern = new RegExp(
          `^(.+?)\\s+(${termAlternatives})\\s+${direction.pinyin}$`,
          'i',
        )
        output = output.replace(
          spacedTermBeforeDirectionPattern,
          (_match, base: string, rawTerm: string) =>
            `${normalizeEmbeddedTermSuffix(
              base.trim(),
              chineseContext,
            )} ${normalizeTermForPostpositiveDirection(
              rawTerm,
              term,
            )} ${direction.english}`,
        )

        term.pinyin
          .map((termValue) => termValue.replace(/\s+/g, ''))
          .filter((termValue) => termValue.length > 1)
          .forEach((compactTerm) => {
            const compactTermBeforeDirectionPattern = new RegExp(
              `^(.+?)${compactTerm}${direction.pinyin}$`,
              'i',
            )
            output = output.replace(
              compactTermBeforeDirectionPattern,
              (_match, base: string) =>
                `${normalizeEmbeddedTermSuffix(
                  base.trim(),
                  chineseContext,
                )} ${term.english} ${direction.english}`,
            )
          })
      }
    })
  })

  return output
}

const applyTerminalDirectionalRules = (
  latinName: string,
  chineseContext: string,
) => {
  let output = latinName

  POSTPOSITIVE_DIRECTIONS.forEach((direction) => {
    if (!direction.chinese.some((chineseValue) => chineseContext.endsWith(chineseValue))) {
      return
    }

    const spacedTerminalDirectionPattern = new RegExp(
      `^(.+?)\\s+${direction.pinyin}$`,
      'i',
    )
    output = output.replace(
      spacedTerminalDirectionPattern,
      (_match, base: string) =>
        `${normalizeEmbeddedTermSuffix(base.trim(), chineseContext)} ${direction.english}`,
    )

    const compactTerminalDirectionPattern = new RegExp(
      `^(.{3,})${direction.pinyin}$`,
      'i',
    )
    output = output.replace(
      compactTerminalDirectionPattern,
      (_match, base: string) =>
        `${normalizeEmbeddedTermSuffix(base.trim(), chineseContext)} ${direction.english}`,
    )
  })

  return output
}

const normalizeLatinStationName = (latinName: string, chineseContext: string) => {
  let output = applyPhraseRules(latinName.trim(), chineseContext)
  if (!output || !chineseContext) {
    return output
  }

  output = applyPostpositiveDirectionalRules(output, chineseContext)
  output = applyTerminalDirectionalRules(output, chineseContext)

  ;[...DIRECTION_ONLY_STATION_RULES, ...STATION_NAME_RULES].forEach((rule) => {
    if (!hasChineseSuffix(chineseContext, rule.chineseSuffixes)) {
      return
    }
    if (hasExcludedChineseSuffix(chineseContext, rule.excludedChineseSuffixes)) {
      return
    }
    output = replaceLatinSuffix(
      output,
      rule.latinSuffixes,
      rule.replacement,
      rule.compactMode,
      rule.compactOnly,
    )
  })

  return output
}

export const normalizeChineseStationDisplayName = (
  value?: string | null,
  chineseContextOverride?: string,
) => {
  const repaired = repairMojibakeString(value ?? '')
  if (!repaired.trim()) {
    return repaired
  }

  const ownChineseContext = extractChineseContext(repaired)
  const chineseContext = chineseContextOverride || ownChineseContext
  if (!chineseContext) {
    return repaired
  }

  const parentheticalMatch = repaired.match(CJK_PARENTHESES_RE)
  if (parentheticalMatch?.index !== undefined) {
    const rawLatinPrefix = repaired.slice(0, parentheticalMatch.index)
    const latinPrefix = rawLatinPrefix.trimEnd()
    if (!latinPrefix) {
      return repaired
    }
    const normalizedPrefix = normalizeLatinStationName(latinPrefix, chineseContext)
    const separator = /\s$/.test(rawLatinPrefix) ? ' ' : ''
    return `${normalizedPrefix}${separator}${repaired.slice(parentheticalMatch.index)}`
  }

  if (/[\u3400-\u9fff]/.test(repaired)) {
    return repaired
  }

  return normalizeLatinStationName(repaired, chineseContext)
}

export const extractChineseStationNameContext = extractChineseContext
