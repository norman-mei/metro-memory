const fs = require('fs')
const path = require('path')
const OpenCC = require('opencc-js')
const { pinyin } = require('pinyin-pro')

const cityDir = path.join('src', 'app', '(game)', 'asia', 'china', 'sanya')
const dataDir = path.join(cityDir, 'data')
const source = JSON.parse(fs.readFileSync(path.join(dataDir, 'sanya.geojson'), 'utf8'))
const toTraditionalChinese = OpenCC.Converter({ from: 'cn', to: 'tw' })

const lineDefs = [
  ['SanyaTramT1', 'T1', '#6DB6D6', 'sanya1.png', ['三亚有轨电车T1线'], [
    ['Sanya Railway Station', '三亚火车站'],
    ['Yuxiu Road', '育秀路'],
    ['Fenghuang Road', '凤凰路'],
    ['Shuicheng Road', '解放路'],
    ['Sanya River East Road', '三亚河东路'],
    ['Jiefang Road', '解放路'],
    ['Jinjiling Street', '金鸡岭街'],
    ['Youyi Street', '友谊街'],
    ['Yingbin Road', '迎宾路'],
    ['Jixiang Street', '吉祥街'],
    ['Tuanjie Street', '团结街'],
    ['Xinfeng Street', '新风街'],
    ['Guangming Street', '光明街'],
    ['Yuejin Street', '跃进街'],
    ['Jiangang Road', '建港路', ['Jiangaang Road']],
  ]],
]

function norm(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim()
}

function collectCoords(coords, out = []) {
  if (typeof coords?.[0] === 'number') out.push(coords)
  else if (Array.isArray(coords)) coords.forEach((item) => collectCoords(item, out))
  return out
}

function center(feature) {
  const coords = collectCoords(feature.geometry.coordinates)
  const sum = coords.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0])
  return [Number((sum[0] / coords.length).toFixed(7)), Number((sum[1] / coords.length).toFixed(7))]
}

function propValues(properties) {
  return [
    properties.name,
    properties['name:en'],
    properties['name:zh'],
    properties['name:zh-Hans'],
    properties['name:zh-Hant'],
    properties.alt_name,
    properties.official_name,
    properties.short_name,
    properties.ref,
    properties.network,
  ].filter(Boolean)
}

function networkMatches(properties, keys) {
  const haystack = norm([
    properties.network,
    properties.route,
    properties.name,
    properties['name:en'],
    properties['name:zh'],
    properties.operator,
  ].filter(Boolean).join(' | '))
  return keys.some((key) => haystack.includes(norm(key)))
}

function stationCandidates(lineKeys) {
  return source.features.filter((feature) => {
    const type = feature.geometry?.type
    const properties = feature.properties || {}
    if (!['Point', 'Polygon', 'MultiPolygon'].includes(type)) return false
    return networkMatches(properties, lineKeys) || properties.station === 'light_rail'
  })
}

function findStations(lineKeys, stationName, chineseName, extraAliases = []) {
  const candidates = stationCandidates(lineKeys)
  const matchAliases = (aliases) => candidates.filter((feature) => {
    const names = propValues(feature.properties || {}).map(norm)
    return aliases.some((alias) => names.some((name) => name === alias))
  })
  const primaryMatches = matchAliases([stationName, ...extraAliases].filter(Boolean).map(norm))
  if (primaryMatches.length > 0) return primaryMatches
  return matchAliases([chineseName].filter(Boolean).map(norm))
}

function aliasesFrom(feature, stationName, chineseName, extraAliases = []) {
  const properties = feature.properties || {}
  const set = new Set([stationName, chineseName, ...extraAliases].filter(Boolean))
  for (const key of [
    'name',
    'name:en',
    'name:zh',
    'name:zh-Hans',
    'name:zh-Hant',
    'alt_name',
    'official_name',
    'short_name',
    'ref',
  ]) {
    if (properties[key]) set.add(properties[key])
  }
  const simplified = chineseName || properties['name:zh-Hans'] || properties['name:zh'] || properties.name
  if (simplified && /[\u4e00-\u9fff]/.test(simplified)) {
    set.add(toTraditionalChinese(simplified))
    set.add(pinyin(simplified, { toneType: 'none', type: 'array' }).join(' '))
  }
  return [...set].filter(Boolean)
}

function displayName(stationName, chineseName) {
  return chineseName ? `${stationName} (${chineseName})` : stationName
}

const lines = Object.fromEntries(lineDefs.map(([id, name, color, icon], order) => [
  id,
  {
    name,
    color,
    backgroundColor: color,
    textColor: '#1F1F1F',
    progressOutlineColor: color,
    statsColor: color,
    order,
    icon: `asia/china/sanya/${icon}`,
    badgeShape: 'circle',
    badgeFit: 'contain',
  },
]))

const routeFeatures = []
lineDefs.forEach(([id, name, color, , keys], order) => {
  source.features
    .filter((feature) => feature.geometry?.type === 'LineString' && routeMatches(feature.properties || {}, keys))
    .forEach((feature) => {
      routeFeatures.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: { line: id, name, color, order },
      })
    })
})

function routeMatches(properties, keys) {
  return networkMatches(properties, keys)
}

let nextId = 1
const stationFeatures = []
const skipped = []
lineDefs.forEach(([lineId, , , , keys, stations]) => {
  stations.forEach(([stationName, chineseName, extraAliases = []], order) => {
    const matches = findStations(keys, stationName, chineseName, extraAliases)
    if (matches.length === 0) {
      skipped.push(`${lineId}: ${stationName}`)
      return
    }
    if (matches.length > 2) {
      throw new Error(`${lineId}: ${stationName} matched ${matches.length} station features`)
    }
    matches.forEach((feature) => {
      stationFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: center(feature),
        },
        properties: {
          id: nextId,
          name: displayName(stationName, chineseName),
          line: lineId,
          order,
          alternate_names: aliasesFrom(feature, stationName, chineseName, extraAliases),
        },
        id: nextId,
      })
      nextId += 1
    })
  })
})

fs.writeFileSync(path.join(dataDir, 'lines.json'), `${JSON.stringify(lines, null, 2)}\n`)
fs.writeFileSync(path.join(dataDir, 'routes.json'), `${JSON.stringify({ type: 'FeatureCollection', features: routeFeatures }, null, 2)}\n`)
fs.writeFileSync(path.join(dataDir, 'features.json'), `${JSON.stringify({ type: 'FeatureCollection', features: stationFeatures }, null, 2)}\n`)
fs.writeFileSync(path.join(dataDir, 'skipped-stations.json'), `${JSON.stringify(skipped, null, 2)}\n`)
console.log(`Generated ${Object.keys(lines).length} lines, ${routeFeatures.length} route segments, ${stationFeatures.length} station features.`)
if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} stations:\n${skipped.join('\n')}`)
}
