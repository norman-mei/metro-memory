const fs = require('fs')
const path = require('path')
const OpenCC = require('opencc-js')
const { pinyin } = require('pinyin-pro')

const cityDir = path.join('src', 'app', '(game)', 'asia', 'indonesia', 'jakarta')
const dataDir = path.join(cityDir, 'data')
const source = JSON.parse(fs.readFileSync(path.join(dataDir, 'jakarta.geojson'), 'utf8'))
const updatedRouteSource = JSON.parse(fs.readFileSync(path.join(dataDir, 'new.geojson'), 'utf8'))
const toTraditionalChinese = OpenCC.Converter({ from: 'cn', to: 'tw' })

const lineDefs = [
  ['JakartaMRTNorthSouth', 'North-South', '#D21A48', 'MRTNorth-South.png', ['MRT Jakarta Jalur Utara-Selatan', 'Jakarta MRT North-South Line'], [
    'Lebak Bulus',
    'Fatmawati Indomaret',
    'Cipete Raya Tuku',
    'Haji Nawi',
    'Blok A',
    'Blok M BCA',
    'ASEAN Headquarters',
    'Senayan Mastercard',
    'Istora Mandiri',
    'Bendungan Hilir',
    'Setiabudi Astra',
    'Dukuh Atas BNI',
    'Bundaran HI Bank Jakarta',
  ]],
  ['JakartaLRTSouth', 'South', '#F26324', 'LRTSouth.png', ['LRT Jakarta Kalapa Gading - Velodrome Line', 'Jakarta LRT', 'LRT Jakarta'], [
    'Pegangsaan Dua',
    'Boulevard Utara',
    'Boulevard Selatan',
    'Pulomas',
    'Equestrian',
    'Velodrome',
  ]],
  ['JabodebekLRTBekasi', 'Bekasi', '#076C3B', 'bekasi.png', ['LRT Jabodebek', 'Jabodebek LRT'], [
    'Dukuh Atas BNI',
    'Setiabudi',
    'Rasuna Said',
    'Kuningan',
    'Pancoran Bank BJB',
    'Cikoko',
    'Ciliwung',
    'Cawang',
    'Halim',
    'Jati Bening Baru',
    'Cikunir 1',
    'Cikunir 2',
    'Bekasi Barat',
    'Jati Mulya',
  ]],
  ['JabodebekLRTCibubur', 'Cibubur', '#1B3D9C', 'cibubur.png', ['LRT Jabodebek', 'Jabodebek LRT'], [
    'Dukuh Atas BNI',
    'Setiabudi',
    'Rasuna Said',
    'Kuningan',
    'Pancoran Bank BJB',
    'Cikoko',
    'Ciliwung',
    'Cawang',
    'TMII',
    'Kampung Rambutan',
    'Ciracas',
    'Harjamukti',
  ]],
  ['KAICommuterSoekarnoHatta', 'Soekarno-Hatta Commuter', '#252065', 'airport.png', ['Airport Commuter', 'Jalur Kereta Api Bandara Soekarno-Hatta', 'Jalur KA Bandara Soekarno-Hatta'], [
    'Manggarai',
    'BNI City',
    'Duri',
    'Rawa Buaya',
    'Batu Ceper',
    'SHIA',
  ]],
  ['SoekarnoHattaAirportSkytrain', 'Soekarno-Hatta Airport Skytrain', '#67686C', 'skytrain.png', ['Kalayang Bandar Udara', 'Airport Skytrain'], [
    'Terminal 3',
    'Terminal 2',
    'Terminal 1',
    'Integrated Building',
  ]],
  ['AncolGondola', 'Gondola Ancol', '#1B3E9B', 'gondola.png', ['Gondola Ancol'], [
    'Stasiun C',
    'Stasiun B',
    'Stasiun A',
  ]],
  ['KeretaWisataSatoSato', 'Kereta Wisata Sato-Sato', '#1B3E9B', 'satosato.png', ['Kereta Wisata Ancol'], [
    'Marina',
    'Dunia Fantasi',
    'Pasar Seni',
    'Sea World',
    'Gerbang Timur',
    'Beach Pool',
    'Bende',
  ]],
]

const manualAliases = {
  'ASEAN Headquarters': ['ASEAN', 'ASEAN HQ', 'Stasiun ASEAN'],
  'Pancoran Bank BJB': ['Pancoran'],
  'Dukuh Atas BNI': ['Dukuh Atas Bank Syariah Indonesia', 'Dukuh Atas'],
  'Jati Bening Baru': ['Jatibening Baru'],
  SHIA: ['Soekarno-Hatta International Airport', 'Soekarno-Hatta Airport', 'Bandara Soekarno-Hatta', 'Airport', 'CGK', 'Jakarta Airport', 'WIII'],
  'Integrated Building': ['Integrated Terminal Building', 'SHIA Railway Station', 'Bandara Soekarno-Hatta'],
  'Stasiun A': ['Station A'],
  'Stasiun B': ['Station B'],
  'Stasiun C': ['Station C'],
  'Sea World': ['Seaworld'],
  Velodrome: ['Halte Velodrome'],
}

const clusterKeys = {
  'JakartaMRTNorthSouth:Dukuh Atas BNI': 'jakarta-bni-city-dukuh-atas-complex',
  'JabodebekLRTBekasi:Dukuh Atas BNI': 'jakarta-bni-city-dukuh-atas-complex',
  'JabodebekLRTCibubur:Dukuh Atas BNI': 'jakarta-bni-city-dukuh-atas-complex',
  'KAICommuterSoekarnoHatta:BNI City': 'jakarta-bni-city-dukuh-atas-complex',
  'KAICommuterSoekarnoHatta:SHIA': 'jakarta-shia-integrated-building-complex',
  'SoekarnoHattaAirportSkytrain:Integrated Building': 'jakarta-shia-integrated-building-complex',
  'AncolGondola:Stasiun C': 'jakarta-ancol-sea-world-stasiun-c-complex',
  'KeretaWisataSatoSato:Sea World': 'jakarta-ancol-sea-world-stasiun-c-complex',
}

const coordinateOverrides = {
  'JakartaMRTNorthSouth:Lebak Bulus': [106.7749299, -6.2892721],
  'JakartaMRTNorthSouth:Fatmawati Indomaret': [106.7924544, -6.2924478],
  'JakartaLRTSouth:Velodrome': [106.8911771, -6.1921316],
  'JabodebekLRTBekasi:Bekasi Barat': [106.9904158, -6.2529526],
  'JabodebekLRTBekasi:Jati Mulya': [107.0216319, -6.2640917],
  'JabodebekLRTCibubur:TMII': [106.8805495, -6.2929066],
  'JabodebekLRTCibubur:Kampung Rambutan': [106.8843688, -6.3095462],
  'JabodebekLRTCibubur:Ciracas': [106.8866361, -6.3237709],
  'JabodebekLRTCibubur:Harjamukti': [106.8956638, -6.3738768],
  'KAICommuterSoekarnoHatta:SHIA': [106.6517671, -6.1275756],
}

function norm(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
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
    properties['name:id'],
    properties['name:ms'],
    properties['name:zh'],
    properties['name:zh-Hans'],
    properties['name:zh-Hant'],
    properties.full_name,
    properties.alt_name,
    properties.official_name,
    properties.short_name,
    properties.ref,
    properties.network,
  ].filter(Boolean)
}

function propText(properties) {
  return propValues(properties).join(' | ')
}

function networkMatches(properties, keys) {
  const haystack = norm([
    properties.network,
    properties.route,
    properties.name,
    properties['name:en'],
    properties.operator,
  ].filter(Boolean).join(' | '))
  return keys.some((key) => haystack.includes(norm(key)))
}

function stationCandidates(lineKeys) {
  return source.features.filter((feature) => {
    const type = feature.geometry?.type
    const properties = feature.properties || {}
    if (!['Point', 'Polygon', 'MultiPolygon'].includes(type)) return false
    return networkMatches(properties, lineKeys)
  })
}

function allStationCandidates() {
  return source.features.filter((feature) => ['Point', 'Polygon', 'MultiPolygon'].includes(feature.geometry?.type))
}

function findStation(lineKeys, stationName) {
  const aliases = [stationName, ...(manualAliases[stationName] || [])].map(norm)
  const findExact = (candidates) => candidates.find((feature) => {
    const names = propValues(feature.properties || {}).map(norm)
    return aliases.some((alias) => names.some((name) => name === alias || name.endsWith(` ${alias}`)))
  })
  const candidates = stationCandidates(lineKeys)
  const exact = findExact(candidates)
  if (exact) return exact
  const loose = candidates.find((feature) => aliases.some((alias) => norm(propText(feature.properties || {})).includes(alias)))
  if (loose) return loose
  return findExact(allStationCandidates())
}

function aliasesFrom(feature, stationName) {
  const properties = feature.properties || {}
  const set = new Set([stationName, ...(manualAliases[stationName] || [])])
  for (const key of [
    'name',
    'name:en',
    'name:id',
    'name:ms',
    'name:zh',
    'name:zh-Hans',
    'name:zh-Hant',
    'full_name',
    'alt_name',
    'official_name',
    'short_name',
    'ref',
  ]) {
    if (properties[key]) set.add(properties[key])
  }
  const chinese = properties['name:zh-Hans'] || properties['name:zh'] || properties['name:zh-Hant']
  if (properties['name:zh-Hans'] || properties['name:zh']) {
    set.add(toTraditionalChinese(properties['name:zh-Hans'] || properties['name:zh']))
  }
  if (chinese) set.add(pinyin(chinese, { toneType: 'none', type: 'array' }).join(' '))
  return [...set].filter(Boolean)
}

function manualAliasesFrom(stationName) {
  return [stationName, ...(manualAliases[stationName] || [])].filter(Boolean)
}

function isLightText(color) {
  return ['#F26324'].includes(color.toUpperCase())
}

const lines = Object.fromEntries(lineDefs.map(([id, name, color, icon], order) => [
  id,
  {
    name,
    color,
    backgroundColor: color,
    textColor: isLightText(color) ? '#1F1F1F' : '#FFFFFF',
    progressOutlineColor: color,
    statsColor: color,
    order,
    icon: `asia/indonesia/jakarta/${icon}`,
    badgeShape: 'circle',
    badgeFit: 'contain',
  },
]))

function jabodebekBranchFor(feature) {
  const coords = collectCoords(feature.geometry.coordinates)
  const lngs = coords.map(([lng]) => lng)
  const lats = coords.map(([, lat]) => lat)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  if (maxLng > 106.9) return 'bekasi'
  if (minLat < -6.265) return 'cibubur'
  return 'shared'
}

function routeFeatureMatches(lineId, properties, feature, keys) {
  if (!networkMatches(properties, keys)) return false
  if (lineId === 'JabodebekLRTBekasi') {
    const branch = jabodebekBranchFor(feature)
    return branch === 'bekasi' || branch === 'shared'
  }
  if (lineId === 'JabodebekLRTCibubur') {
    const branch = jabodebekBranchFor(feature)
    return branch === 'cibubur' || branch === 'shared'
  }
  return true
}

function routeSourceFeatures(lineId) {
  if (lineId === 'JakartaLRTSouth' || lineId === 'JabodebekLRTBekasi' || lineId === 'KAICommuterSoekarnoHatta') {
    return updatedRouteSource.features
  }
  return source.features
}

function routeGeometries(feature) {
  if (feature.geometry?.type === 'LineString') return [feature.geometry]
  if (feature.geometry?.type !== 'MultiLineString') return []
  return feature.geometry.coordinates.map((coordinates) => ({
    type: 'LineString',
    coordinates,
  }))
}

const routeFeatures = []
lineDefs.forEach(([id, name, color, , keys], order) => {
  const matches = routeSourceFeatures(id).filter((feature) => {
    if (!['LineString', 'MultiLineString'].includes(feature.geometry?.type)) return false
    return routeFeatureMatches(id, feature.properties || {}, feature, keys)
  })
  matches.forEach((feature) => {
    routeGeometries(feature).forEach((geometry) => {
      routeFeatures.push({
        type: 'Feature',
        geometry,
        properties: { line: id, name, color, order },
      })
    })
  })
})

let nextId = 1
const stationFeatures = []
const skipped = []
lineDefs.forEach(([lineId, , , , keys, stations]) => {
  stations.forEach((stationName, order) => {
    const feature = findStation(keys, stationName)
    const overrideCoordinates = coordinateOverrides[`${lineId}:${stationName}`]
    if (!feature && !overrideCoordinates) {
      skipped.push(`${lineId}: ${stationName}`)
      return
    }
    stationFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: overrideCoordinates ?? center(feature),
      },
      properties: {
        id: nextId,
        name: stationName,
        line: lineId,
        order,
        alternate_names: feature ? aliasesFrom(feature, stationName) : manualAliasesFrom(stationName),
        ...(clusterKeys[`${lineId}:${stationName}`] ? { cluster_key: clusterKeys[`${lineId}:${stationName}`] } : {}),
      },
      id: nextId,
    })
    nextId += 1
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
