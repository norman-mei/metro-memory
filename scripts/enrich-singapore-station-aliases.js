const fs = require('fs')
const path = require('path')
const { Converter } = require('opencc-js')
const { pinyin } = require('pinyin-pro')

const workspaceRoot = process.cwd()
const featuresPath = path.join(
  workspaceRoot,
  'src/app/(game)/asia/singapore/data/features.json',
)
const sourcePath = path.join(
  workspaceRoot,
  'src/app/(game)/asia/singapore/data/singapore.geojson',
)

const toTraditional = Converter({ from: 'cn', to: 'hk' })
const toSimplified = Converter({ from: 'hk', to: 'cn' })

const SOURCE_NAME_OVERRIDES = {
  'Mount Faber': 'Faber Peak',
  Sentosa: 'Imbiah Lookout',
  'Station A South': 'A South',
  'Station A': 'A',
  'Station B': 'B',
  'Station C': 'C',
  'Station D': 'D',
  'Station E': 'E',
  'Station F': 'F',
  'Vivo City': 'VivoCity',
}

const MANUAL_ONLY_STATION_NAMES = new Set([
  'Station A',
  'Station F',
  'Station A South',
])

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const writeJson = (filePath, value) =>
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const getLanguageRecord = (properties = {}) => ({
  english: properties['name:en'] || properties.name || '',
  malay: properties['name:ms'] || '',
  tamil: properties['name:ta'] || '',
  chinese: properties['name:zh'] || '',
})

const getLanguageScore = (record) =>
  ['malay', 'tamil', 'chinese'].reduce(
    (score, key) => score + (record[key] ? 1 : 0),
    0,
  )

const addToIndex = (index, key, record) => {
  if (!key) return
  const normalizedKey = normalize(key)
  if (!normalizedKey) return
  const existing = index.get(normalizedKey)
  if (!existing || getLanguageScore(record) > getLanguageScore(existing)) {
    index.set(normalizedKey, record)
  }
}

const source = readJson(sourcePath)
const sourceByName = new Map()

for (const feature of source.features) {
  const record = getLanguageRecord(feature.properties)
  addToIndex(sourceByName, feature.properties?.name, record)
  addToIndex(sourceByName, feature.properties?.['name:en'], record)
}

const featuresCollection = readJson(featuresPath)

let featuresUpdated = 0
let malayAdded = 0
let tamilAdded = 0
let zhHansAdded = 0
let zhHantAdded = 0
let pinyinAdded = 0
let sourceAliasAdded = 0

for (const feature of featuresCollection.features) {
  if (feature.geometry?.type !== 'Point') continue

  const props = feature.properties || {}
  const displayName = props.name
  const sourceName = SOURCE_NAME_OVERRIDES[displayName] || displayName
  const sourceRecord = sourceByName.get(normalize(sourceName))

  if (!sourceRecord) {
    if (MANUAL_ONLY_STATION_NAMES.has(displayName)) {
      continue
    }
    throw new Error(`No Singapore source record found for ${displayName}`)
  }

  const aliases = []
  const seen = new Set()

  const addAlias = (value) => {
    if (!value) return false
    const trimmed = String(value).trim()
    if (!trimmed) return false
    const normalizedValue = normalize(trimmed)
    if (
      !normalizedValue ||
      normalizedValue === normalize(displayName) ||
      normalizedValue === normalize(sourceName) ||
      seen.has(normalizedValue)
    ) {
      return false
    }
    seen.add(normalizedValue)
    aliases.push(trimmed)
    return true
  }

  for (const alias of props.alternate_names || []) {
    addAlias(alias)
  }

  if (displayName !== sourceName && addAlias(sourceName)) {
    sourceAliasAdded += 1
  }

  const malay = sourceRecord.malay.trim()
  if (malay && addAlias(malay)) {
    malayAdded += 1
  }

  const tamil = sourceRecord.tamil.trim()
  if (tamil && addAlias(tamil)) {
    tamilAdded += 1
  }

  const chineseRaw = sourceRecord.chinese.trim()
  if (chineseRaw) {
    const chineseSimplified = toSimplified(chineseRaw)
    const chineseTraditional = toTraditional(chineseSimplified)
    if (addAlias(chineseSimplified)) {
      zhHansAdded += 1
    }
    const chinesePinyin = pinyin(chineseSimplified, {
      toneType: 'none',
      type: 'text',
      nonZh: 'spaced',
      v: false,
    })
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    if (chinesePinyin && addAlias(chinesePinyin)) {
      pinyinAdded += 1
    }
    if (
      normalize(chineseTraditional) !== normalize(chineseSimplified) &&
      addAlias(chineseTraditional)
    ) {
      zhHantAdded += 1
    }
  }

  const nextAlternateNames = aliases
  const previousAlternateNames = props.alternate_names || []
  if (JSON.stringify(previousAlternateNames) !== JSON.stringify(nextAlternateNames)) {
    props.alternate_names = nextAlternateNames
    feature.properties = props
    featuresUpdated += 1
  }
}

writeJson(featuresPath, featuresCollection)

console.log(
  JSON.stringify(
    {
      featuresUpdated,
      malayAdded,
      tamilAdded,
      zhHansAdded,
      zhHantAdded,
      pinyinAdded,
      sourceAliasAdded,
    },
    null,
    2,
  ),
)
