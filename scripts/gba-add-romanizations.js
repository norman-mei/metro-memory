#!/usr/bin/env node

/**
 * Auto-generates Traditional Chinese, Pinyin, and Jyutping aliases for every
 * GBA station that has a Chinese name. Existing alternates are preserved and
 * deduplicated; stations lacking a Chinese name are left untouched.
 */

const fs = require('fs')
const path = require('path')
const OpenCC = require('opencc-js')
const { pinyin } = require('pinyin-pro')
const { getJyutpingText } = require('to-jyutping')

const featuresPath = path.join(
  __dirname,
  '..',
  'src',
  'app',
  '(game)',
  'asia',
  'china',
  'gba',
  'data',
  'features.json',
)

const converter = OpenCC.Converter({ from: 'cn', to: 'hk' })

const normalize = (value) => value.trim().toLowerCase()

const HK_MO_DISPLAY_NORMALIZATIONS = [
  ['東涌東', '東湧東'],
  ['東涌西', '東湧西'],
  ['東涌', '東湧'],
  ['鰂魚涌', '鰂魚湧'],
  ['高峰登山纜車站', '高峯登山纜車站'],
  ['海洋列車高峰站', '海洋列車高峯站'],
  ['高峻登山纜車站', '高峯登山纜車站'],
  ['海洋列車高峻站', '海洋列車高峯站'],
  ['干諾道西', '幹諾道西'],
  ['文華里', '文華裏'],
  ['天樂里', '天樂裏'],
  ['船塢里', '船塢裏'],
  ['景峰', '景峯'],
  ['景峻', '景峯'],
  ['恒安', '恆安'],
  ['天恒', '天恆'],
]

const normalizeHkMoDisplayText = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  let output = value
  HK_MO_DISPLAY_NORMALIZATIONS.forEach(([from, to]) => {
    output = output.replaceAll(from, to)
  })
  return output
}

const WIN1252_REVERSE_MAP = new Map([
  ['€', 0x80],
  ['‚', 0x82],
  ['ƒ', 0x83],
  ['„', 0x84],
  ['…', 0x85],
  ['†', 0x86],
  ['‡', 0x87],
  ['ˆ', 0x88],
  ['‰', 0x89],
  ['Š', 0x8a],
  ['‹', 0x8b],
  ['Œ', 0x8c],
  ['Ž', 0x8e],
  ['‘', 0x91],
  ['’', 0x92],
  ['“', 0x93],
  ['”', 0x94],
  ['•', 0x95],
  ['–', 0x96],
  ['—', 0x97],
  ['˜', 0x98],
  ['™', 0x99],
  ['š', 0x9a],
  ['›', 0x9b],
  ['œ', 0x9c],
  ['ž', 0x9e],
  ['Ÿ', 0x9f],
])

const MOJIBAKE_PATTERN =
  /[ÃÂâäåæçèéêëìíîïðñòóôõöøùúûüýþÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/

const countChineseChars = (value) =>
  (value.match(/[\u3400-\u9fff]/g) || []).length

const encodeWin1252 = (value) => {
  const bytes = []
  for (const char of value) {
    const code = char.codePointAt(0)
    if (typeof code !== 'number') return null
    if (code <= 0xff) {
      bytes.push(code)
      continue
    }
    const mapped = WIN1252_REVERSE_MAP.get(char)
    if (typeof mapped !== 'number') {
      return null
    }
    bytes.push(mapped)
  }
  return Buffer.from(bytes)
}

const repairMojibakeString = (value) => {
  if (typeof value !== 'string' || !MOJIBAKE_PATTERN.test(value)) {
    return value
  }

  let current = value
  let best = value
  let bestChineseCount = countChineseChars(value)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const encoded = encodeWin1252(current)
    if (!encoded) break

    const repaired = encoded.toString('utf8')
    if (!repaired || repaired.includes('\uFFFD')) break

    const repairedChineseCount = countChineseChars(repaired)
    if (repairedChineseCount <= bestChineseCount) {
      break
    }

    best = repaired
    bestChineseCount = repairedChineseCount
    current = repaired
  }

  return best
}

const repairStringArray = (values) => {
  if (!Array.isArray(values)) {
    return values
  }
  return values.map((value) =>
    typeof value === 'string' ? repairMojibakeString(value) : value,
  )
}

const extractChinese = (value) => {
  const matches = value.match(/[\u3400-\u9fff]+/g)
  if (!matches || matches.length === 0) {
    return ''
  }
  return matches.sort((a, b) => b.length - a.length)[0] || ''
}

const scoreChineseCandidate = (value) => {
  let score = value.length * 10
  if (/站站$/.test(value)) {
    score -= 25
  }
  if (/總站$/.test(value)) {
    score += 4
  }
  if (converter(value) === value) {
    score += 3
  }
  return score
}

const selectBestChineseCandidate = (values) => {
  const candidates = Array.from(
    new Set(values.map((value) => extractChinese(value)).filter(Boolean)),
  )
  if (candidates.length === 0) {
    return ''
  }

  return candidates
    .sort((left, right) => scoreChineseCandidate(right) - scoreChineseCandidate(left))[0]
}

const restoreQuestionMarkPlaceholders = (value, chinese) => {
  if (typeof value !== 'string' || !value.includes('?') || !chinese) {
    return value
  }
  return value.replace(/\?+/g, chinese)
}

const addIfMissing = (set, list, value) => {
  const normalized = normalize(value)
  if (!normalized || set.has(normalized)) {
    return false
  }
  set.add(normalized)
  list.push(value)
  return true
}

const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8'))

let featuresUpdated = 0
let tradAdded = 0
let pinyinAdded = 0
let jyutpingAdded = 0
let repairedStrings = 0

for (const feature of data.features) {
  if (!feature?.properties) continue

  const props = feature.properties

  ;['name', 'long_name', 'display_name', 'short_name'].forEach((key) => {
    if (typeof props[key] !== 'string') {
      return
    }
    const normalizedDisplay = normalizeHkMoDisplayText(props[key])
    if (normalizedDisplay !== props[key]) {
      props[key] = normalizedDisplay
      repairedStrings += 1
    }
  })

  ;['name', 'long_name', 'display_name', 'short_name'].forEach((key) => {
    if (typeof props[key] !== 'string') {
      return
    }
    const repaired = repairMojibakeString(props[key])
    if (repaired !== props[key]) {
      props[key] = repaired
      repairedStrings += 1
    }
  })

  if (Array.isArray(props.alternate_names)) {
    const repairedAlternates = repairStringArray(props.alternate_names)
    repairedAlternates.forEach((value, index) => {
      if (value !== props.alternate_names[index]) {
        repairedStrings += 1
      }
    })
    props.alternate_names = repairedAlternates
  }

  if (Array.isArray(props.connections)) {
    const repairedConnections = repairStringArray(props.connections)
    repairedConnections.forEach((value, index) => {
      if (value !== props.connections[index]) {
        repairedStrings += 1
      }
    })
    props.connections = repairedConnections
  }

  const chineseCandidates = []
  ;[props.name, props.long_name, props.display_name, props.short_name].forEach(
    (value) => {
      if (typeof value === 'string') {
        chineseCandidates.push(value)
      }
    },
  )
  if (Array.isArray(props.alternate_names)) {
    props.alternate_names.forEach((value) => {
      if (typeof value === 'string') {
        chineseCandidates.push(value)
      }
    })
  }
  const inferredChinese = selectBestChineseCandidate(chineseCandidates)

  ;['name', 'long_name', 'display_name', 'short_name'].forEach((key) => {
    if (typeof props[key] !== 'string') {
      return
    }
    const restored = restoreQuestionMarkPlaceholders(props[key], inferredChinese)
    if (restored !== props[key]) {
      props[key] = restored
      repairedStrings += 1
    }
  })

  if (Array.isArray(props.alternate_names)) {
    const restoredAlternates = props.alternate_names.map((value) =>
      typeof value === 'string'
        ? restoreQuestionMarkPlaceholders(value, inferredChinese)
        : value,
    )
    restoredAlternates.forEach((value, index) => {
      if (value !== props.alternate_names[index]) {
        repairedStrings += 1
      }
    })
    props.alternate_names = restoredAlternates
  }

  const alternates = Array.isArray(props.alternate_names)
    ? [...props.alternate_names]
    : []
  const altSet = new Set(alternates.map((value) => normalize(value)))

  const candidates = []
  ;[props.name, props.long_name, props.display_name, props.short_name].forEach(
    (value) => {
      if (typeof value === 'string') {
        candidates.push(value)
      }
    },
  )

  if (Array.isArray(props.alternate_names)) {
    for (const value of props.alternate_names) {
      if (typeof value === 'string') {
        candidates.push(value)
      }
    }
  }

  let chinese = ''
  for (const candidate of candidates) {
    const extracted = extractChinese(candidate)
    if (extracted && extracted.length > chinese.length) {
      chinese = extracted
    }
  }

  if (!chinese) {
    continue
  }

  const trad = converter(chinese)
  const pinyinValue = pinyin(chinese, { toneType: 'none', type: 'array' })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const jyutpingValue = getJyutpingText(trad)
    .replace(/\s+/g, ' ')
    .trim()

  let updated = false
  if (addIfMissing(altSet, alternates, trad)) {
    tradAdded++
    updated = true
  }
  if (pinyinValue && addIfMissing(altSet, alternates, pinyinValue)) {
    pinyinAdded++
    updated = true
  }
  if (jyutpingValue && addIfMissing(altSet, alternates, jyutpingValue)) {
    jyutpingAdded++
    updated = true
  }

  if (updated) {
    props.alternate_names = alternates
    featuresUpdated++
  }
}

fs.writeFileSync(featuresPath, JSON.stringify(data, null, 2) + '\n')

console.log(
  `Updated ${featuresUpdated} features; repaired ${repairedStrings} corrupted strings; added ${tradAdded} trad, ${pinyinAdded} pinyin, ${jyutpingAdded} jyutping entries.`,
)
