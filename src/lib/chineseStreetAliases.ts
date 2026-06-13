type StreetTermGroup = {
  english: string[]
  pinyin: string[]
  chinese: string[]
}

const STREET_TERM_GROUPS: StreetTermGroup[] = [
  {
    english: ['bridge', 'brg'],
    pinyin: ['qiao'],
    chinese: ['桥', '橋'],
  },
  {
    english: ['avenue', 'ave', 'av'],
    pinyin: ['da jie', 'dajie'],
    chinese: ['大街'],
  },
  {
    english: ['street', 'st'],
    pinyin: ['jie'],
    chinese: ['街'],
  },
  {
    english: ['road', 'rd'],
    pinyin: ['lu'],
    chinese: ['路'],
  },
  {
    english: ['boulevard', 'blvd'],
    pinyin: ['da dao', 'dadao'],
    chinese: ['大道', '大路'],
  },
  {
    english: ['alley', 'lane', 'ln'],
    pinyin: ['xiang'],
    chinese: ['巷'],
  },
  {
    english: ['alley', 'lane', 'hutong'],
    pinyin: ['hu tong', 'hutong'],
    chinese: ['胡同'],
  },
  {
    english: ['lane', 'ln'],
    pinyin: ['li'],
    chinese: ['里', '裏'],
  },
  {
    english: ['square', 'sq'],
    pinyin: ['guang chang', 'guangchang'],
    chinese: ['广场', '廣場'],
  },
  {
    english: ['plaza', 'plz'],
    pinyin: ['guang chang', 'guangchang'],
    chinese: ['广场', '廣場'],
  },
  {
    english: ['park', 'pk'],
    pinyin: ['gong yuan', 'gongyuan'],
    chinese: ['公园', '公園'],
  },
  {
    english: ['park', 'garden'],
    pinyin: ['yuan'],
    chinese: ['园', '園'],
  },
  {
    english: ['garden', 'gardens'],
    pinyin: ['hua yuan', 'huayuan'],
    chinese: ['花园', '花園'],
  },
  {
    english: ['center', 'centre', 'ctr'],
    pinyin: ['zhong xin', 'zhongxin'],
    chinese: ['中心'],
  },
  {
    english: [
      'exhibition center',
      'exhibition centre',
      'expo center',
      'expo centre',
    ],
    pinyin: ['hui zhan zhong xin', 'huizhanzhongxin'],
    chinese: ['会展中心', '會展中心'],
  },
  {
    english: ['exhibition hall', 'expo hall'],
    pinyin: ['zhan lan guan', 'zhanlanguan'],
    chinese: ['展览馆', '展覽館'],
  },
  {
    english: ['mall'],
    pinyin: ['shang chang', 'shangchang'],
    chinese: ['商场', '商場'],
  },
  {
    english: ['market'],
    pinyin: ['shi chang', 'shichang'],
    chinese: ['市场', '市場'],
  },
  {
    english: ['library'],
    pinyin: ['tu shu guan', 'tushuguan'],
    chinese: ['图书馆', '圖書館'],
  },
  {
    english: ['museum', 'hall'],
    pinyin: ['guan'],
    chinese: ['馆', '館'],
  },
  {
    english: ['airport'],
    pinyin: ['ji chang', 'jichang'],
    chinese: ['机场', '機場'],
  },
  {
    english: ['terminal'],
    pinyin: ['hang zhan lou', 'hangzhanlou'],
    chinese: ['航站楼', '航站樓'],
  },
  {
    english: ['port'],
    pinyin: ['gang'],
    chinese: ['港'],
  },
  {
    english: ['village'],
    pinyin: ['cun'],
    chinese: ['村'],
  },
  {
    english: ['village', 'estate'],
    pinyin: ['zhuang'],
    chinese: ['庄', '莊'],
  },
  {
    english: ['city', 'town'],
    pinyin: ['cheng'],
    chinese: ['城'],
  },
  {
    english: ['district', 'area'],
    pinyin: ['qu'],
    chinese: ['区', '區'],
  },
  {
    english: ['tower', 'building'],
    pinyin: ['lou'],
    chinese: ['楼', '樓'],
  },
  {
    english: ['factory', 'plant'],
    pinyin: ['chang'],
    chinese: ['厂', '廠'],
  },
  {
    english: ['temple'],
    pinyin: ['si'],
    chinese: ['寺'],
  },
  {
    english: ['temple'],
    pinyin: ['miao'],
    chinese: ['庙', '廟'],
  },
  {
    english: ['lake'],
    pinyin: ['hu'],
    chinese: ['湖'],
  },
  {
    english: ['river'],
    pinyin: ['he'],
    chinese: ['河'],
  },
  {
    english: ['mountain', 'hill'],
    pinyin: ['shan'],
    chinese: ['山'],
  },
  {
    english: ['bay'],
    pinyin: ['wan'],
    chinese: ['湾', '灣'],
  },
  {
    english: ['checkpoint', 'border crossing'],
    pinyin: ['kou an', 'kouan'],
    chinese: ['口岸'],
  },
  {
    english: ['gate', 'entrance'],
    pinyin: ['men'],
    chinese: ['门', '門'],
  },
  {
    english: ['entrance', 'exit', 'gate'],
    pinyin: ['kou'],
    chinese: ['口'],
  },
]

const normalizeAliasSpacing = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/^[,\-]\s*/g, '')
    .replace(/\s*[,\-]\s*$/g, '')
    .trim()

const addAlias = (aliases: Set<string>, value: string, original: string) => {
  const normalized = normalizeAliasSpacing(value)
  if (!normalized || normalized.toLowerCase() === original.toLowerCase()) {
    return
  }
  aliases.add(normalized)
}

const replaceLatinTerms = (
  aliases: Set<string>,
  input: string,
  sourceTerms: string[],
  replacementTerms: string[],
) => {
  sourceTerms.forEach((sourceTerm) => {
    const pattern = new RegExp(`\\b${sourceTerm.replace(/\s+/g, '\\s+')}\\b`, 'gi')
    if (!pattern.test(input)) {
      return
    }
    replacementTerms.forEach((replacementTerm) => {
      pattern.lastIndex = 0
      addAlias(aliases, input.replace(pattern, replacementTerm), input)
    })
  })
}

const replaceChineseTerms = (
  aliases: Set<string>,
  input: string,
  sourceTerms: string[],
  replacementTerms: string[],
) => {
  sourceTerms.forEach((sourceTerm) => {
    if (!input.includes(sourceTerm)) {
      return
    }
    replacementTerms.forEach((replacementTerm) => {
      addAlias(aliases, input.replaceAll(sourceTerm, replacementTerm), input)
    })
  })
}

export const generateChineseStreetAlternates = (
  value?: string | null,
): string[] => {
  const input = normalizeAliasSpacing(value ?? '')
  if (!input) {
    return []
  }

  const aliases = new Set<string>()

  STREET_TERM_GROUPS.forEach((group) => {
    const latinTerms = [...group.english, ...group.pinyin]
    replaceLatinTerms(aliases, input, latinTerms, group.english)
    replaceLatinTerms(aliases, input, latinTerms, group.pinyin)
    replaceChineseTerms(aliases, input, group.chinese, group.english)
    replaceChineseTerms(aliases, input, group.chinese, group.pinyin)
  })

  return Array.from(aliases)
}

export const generateContextualChineseStreetAlternates = (
  values: Array<string | null | undefined>,
): string[] => {
  const sources = values
    .map((value) => normalizeAliasSpacing(value ?? ''))
    .filter(Boolean)
  if (sources.length === 0) {
    return []
  }

  const aliases = new Set<string>()
  const allowedGroups = STREET_TERM_GROUPS.filter((group) =>
    sources.some((source) =>
      group.chinese.some((chineseTerm) => source.includes(chineseTerm)),
    ),
  )

  allowedGroups.forEach((group) => {
    const compactPinyinTerms = Array.from(
      new Set(group.pinyin.map((term) => term.replace(/\s+/g, '').toLowerCase())),
    ).filter((term) => term.length > 1)

    sources.forEach((source) => {
      compactPinyinTerms.forEach((compactTerm) => {
        const pattern = new RegExp(`^(.+?)${compactTerm}$`, 'i')
        const match = source.match(pattern)
        const base = match?.[1]
        if (!base || !/[a-z]/i.test(base)) {
          return
        }

        group.english.forEach((englishTerm) => {
          addAlias(aliases, `${base} ${englishTerm}`, source)
        })
        group.pinyin
          .filter((pinyinTerm) => pinyinTerm.includes(' '))
          .forEach((pinyinTerm) => {
            addAlias(aliases, `${base} ${pinyinTerm}`, source)
          })
      })
    })
  })

  return Array.from(aliases)
}
