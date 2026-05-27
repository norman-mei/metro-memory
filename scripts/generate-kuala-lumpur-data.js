const fs = require('fs')
const path = require('path')
const { pinyin } = require('pinyin-pro')

const cityDir = path.join('src', 'app', '(game)', 'asia', 'malaysia', 'kuala-lumpur')
const dataDir = path.join(cityDir, 'data')
const source = JSON.parse(fs.readFileSync(path.join(dataDir, 'kl.geojson'), 'utf8'))

const lineDefs = [
  ['KualaLumpurLRTAmpang', 'LRT Ampang', '#F4850A', 'Line3.png', ['Ampang Line'], [
    'Sentul Timur', 'Sentul', 'Titiwangsa', 'PWTC', 'Sultan Ismail', 'Bandaraya-UOB',
    'Masjid Jamek', 'Plaza Rakyat', 'BBCC-Hang Tuah', 'Pudu', 'Chan Sow Lin', 'Miharja',
    'Maluri', 'Pandan Jaya', 'Pandan Indah', 'Cempaka', 'Cahaya', 'Ampang',
  ]],
  ['KualaLumpurLRTSriPetaling', 'LRT Sri Petaling', '#890A08', 'Line4.png', ['Sri Petaling Line'], [
    'Sentul Timur', 'Sentul', 'Titiwangsa', 'PWTC', 'Sultan Ismail', 'Bandaraya-UOB',
    'Masjid Jamek', 'Plaza Rakyat', 'BBCC-Hang Tuah', 'Pudu', 'Chan Sow Lin', 'Cheras',
    'Salak Selatan', 'Bandar Tun Razak', 'Bandar Tasik Selatan', 'Sungai Besi',
    'Bukit Jalil', 'Sri Petaling', 'Awan Besar', 'Muhibbah', 'Alam Sutera',
    'Kinrara BK 5', 'IOI Puchong Jaya', 'Pusat Bandar Puchong',
    'Taman Perindustrian Puchong', 'Bandar Puteri', 'Puchong Perdana', 'Puchong Prima',
    'Putra Heights',
  ]],
  ['KualaLumpurLRTKelanaJaya', 'LRT Kelana Jaya', '#EE084B', 'Line5.png', ['Laluan Kelana Jaya', 'Kelana Jaya Line'], [
    'Gombak', 'Taman Melati', 'Wangsa Maju', 'Sri Rampai', 'Setiawangsa', 'Jelatek',
    "Dato' Keramat", 'Damai', 'Ampang Park', 'KLCC', 'Kampung Baru-Co-opbank Pertama',
    'Dang Wangi', 'Masjid Jamek', 'Pasar Seni', 'KL Sentral', 'Bank Rakyat-Bangsar',
    'Abdullah Hukum', 'Kerinchi', 'Universiti', 'Taman Jaya', 'Asia Jaya',
    'Taman Paramount', 'Taman Bahagia', 'Kelana Jaya', 'Lembah Subang', 'Ara Damansara',
    'Glenmarie', 'Subang Jaya', 'SS15', 'SS18', 'USJ 7', 'Taipan', 'Wawasan', 'USJ 21',
    'Alam Megah', 'Subang Alam', 'Putra Heights',
  ]],
  ['KualaLumpurKLMonorail', 'KL Monorail', '#81CD23', 'Line8.png', ['Monorel KL', 'KL Monorail'], [
    'KL Sentral', 'Tun Sambanthan', 'Maharajalela', 'BBCC-Hang Tuah', 'Imbi',
    'Bukit Bintang', 'Raja Chulan', 'Bukit Nanas', 'Medan Tuanku', 'Chow Kit', 'Titiwangsa',
  ]],
  ['KualaLumpurMRTKajang', 'MRT Kajang', '#028234', 'Line9.png', ['Laluan Kajang', 'Kajang Line'], [
    'Kwasa Damansara', 'Kwasa Sentral', 'Kota Damansara-Thomson Hospital',
    'Surian-IOI Mall Damansara', 'Mutiara Damansara', 'Bandar Utama',
    'Taman Tun Dr Ismail-Deloitte', 'Phileo Damansara',
    'Pavilion Damansara Heights-Pusat Bandar Damansara', 'Semantan', 'Muzium Negara',
    'Pasar Seni', 'Merdeka', 'Pavilion Kuala Lumpur-Bukit Bintang',
    'Tun Razak Exchange', 'Cochrane', 'Maluri-AEON', 'Taman Pertama', 'Taman Midah',
    'Taman Mutiara', 'Taman Connaught', 'Taman Suntex', 'Sri Raya',
    'Bandar Tun Hussein Onn', 'Batu 11 Cheras', 'Bukit Dukung', 'Sungai Jernih',
    'Stadium Kajang', 'Kajang',
  ]],
  ['KualaLumpurMRTPutrajaya', 'MRT Putrajaya', '#FFCD00', 'Line12.png', ['Laluan Putrajaya', 'Putrajaya Line'], [
    'Kwasa Damansara', 'Kampung Selamat', 'Sungai Buloh', 'Damansara Damai',
    'Sri Damansara Barat', 'Sri Damansara Sentral', 'Sri Damansara Timur', 'Metro Prima',
    'Kepong Baru', 'Jinjang', 'Sri Delima', 'Kampung Batu', 'Kentonmen', 'Jalan Ipoh',
    'Sentul Barat', 'Titiwangsa', 'Hospital Kuala Lumpur', 'Raja Uda', 'Ampang Park',
    'Persiaran KLCC', 'Conlay-Kompleks Kraf', 'Tun Razak Exchange', 'Chan Sow Lin',
    'Kuchai', 'Taman Naga Emas', 'Sungai Besi', 'Serdang Raya Utara',
    'Serdang Raya Selatan', 'Serdang Jaya', 'UPM', 'Taman Equine', 'Putra Permai',
    '16 Sierra', 'Cyberjaya Utara-Finexus', 'Cyberjaya City Centre', 'Putrajaya Sentral',
  ]],
  ['KualaLumpurERLKliaEkspres', 'ERL KLIA Ekspres', '#9A0E8D', 'Line6.png', ['KLIA Ekspres', 'ERL'], [
    'KL Sentral', 'KLIA T1', 'KLIA T2',
  ]],
  ['KualaLumpurERLKliaTransit', 'ERL KLIA Transit', '#3CA6B5', 'Line7.png', ['KLIA Transit', 'ERL'], [
    'KL Sentral', 'Bandar Tasik Selatan', 'Putrajaya & Cyberjaya', 'Salak Tinggi', 'KLIA T1', 'KLIA T2',
  ]],
  ['KualaLumpurKLIAAerotrain', 'Aerotrain', '#FAA831', 'KLIA.png', ['APM', 'KLIA Aerotrain'], [
    'Terminal A', 'Main Terminal',
  ]],
]

const manualAliases = {
  'Sentul Timur': ['Sentul East'],
  'Bandaraya-UOB': ['Bandaraya', 'City Hall'],
  'BBCC-Hang Tuah': ['Hang Tuah', 'BBCC - Hang Tuah'],
  'Kampung Baru-Co-opbank Pertama': ['Kampung Baru'],
  'Bank Rakyat-Bangsar': ['Bangsar'],
  'USJ 7': ['USJ7'],
  'USJ 21': ['USJ21'],
  'Kota Damansara-Thomson Hospital': ['Kota Damansara'],
  'Surian-IOI Mall Damansara': ['Surian'],
  'Taman Tun Dr Ismail-Deloitte': ['Taman Tun Dr Ismail', 'TTDI', 'TTDI-Deloitte'],
  'Pavilion Damansara Heights-Pusat Bandar Damansara': ['Pusat Bandar Damansara'],
  'Muzium Negara': ['National Museum'],
  'Pavilion Kuala Lumpur-Bukit Bintang': ['Bukit Bintang'],
  'Maluri-AEON': ['Maluri'],
  'Sentul Barat': ['Sentul West'],
  'Hospital Kuala Lumpur': ['Kuala Lumpur Hospital'],
  'Conlay-Kompleks Kraf': ['Conlay'],
  'Jinjang': ['Jinjiang'],
  'Taman Equine': ['Equine Park'],
  'Cyberjaya Utara-Finexus': ['Cyberjaya Utara'],
  'Putrajaya & Cyberjaya': ['Putrajaya/Cyberjaya', 'ERL Putrajaya/Cyberjaya'],
  'Bandar Tasik Selatan': ['ERL Bandar Tasik Selatan'],
  'Main Terminal': ['KLIA Terminal 1 (Main Building)', 'Kuala Lumpur International Airport'],
  'Terminal A': ['KLIA Terminal 1 (Satellite Building)', 'Satellite Building A', 'Satellite A'],
}

const clusterKeys = {
  'KualaLumpurLRTAmpang:Sultan Ismail': 'kuala-lumpur-sultan-ismail-medan-tuanku-complex',
  'KualaLumpurKLMonorail:Medan Tuanku': 'kuala-lumpur-sultan-ismail-medan-tuanku-complex',
  'KualaLumpurLRTAmpang:Maluri': 'kuala-lumpur-maluri-aeon-complex',
  'KualaLumpurMRTKajang:Maluri-AEON': 'kuala-lumpur-maluri-aeon-complex',
  'KualaLumpurKLMonorail:Bukit Bintang': 'kuala-lumpur-pavilion-bukit-bintang-complex',
  'KualaLumpurMRTKajang:Pavilion Kuala Lumpur-Bukit Bintang': 'kuala-lumpur-pavilion-bukit-bintang-complex',
}

const coordinateOverrides = {
  'KualaLumpurLRTKelanaJaya:KL Sentral': [101.6864969, 3.1341011],
  'KualaLumpurKLMonorail:KL Sentral': [101.6879247, 3.1326546],
  'KualaLumpurERLKliaTransit:KL Sentral': [101.6866021, 3.1340706],
  'KualaLumpurMRTKajang:Merdeka': [101.7022047, 3.1421254],
  'KualaLumpurLRTAmpang:BBCC-Hang Tuah': [101.7056076, 3.1402684],
  'KualaLumpurLRTSriPetaling:BBCC-Hang Tuah': [101.7056076, 3.1402684],
  'KualaLumpurKLMonorail:BBCC-Hang Tuah': [101.7056076, 3.1402684],
  'KualaLumpurMRTPutrajaya:Titiwangsa': [101.6963117, 3.1745999],
  'KualaLumpurLRTKelanaJaya:Dang Wangi': [101.7018975, 3.1568365],
  'KualaLumpurERLKliaTransit:Bandar Tasik Selatan': [101.7105668, 3.076251],
  'KualaLumpurLRTSriPetaling:Bandar Tasik Selatan': [101.7112202, 3.0760706],
  'KualaLumpurERLKliaTransit:Salak Tinggi': [101.7134329, 2.8254656],
}

const badgeAspectRatios = {
  'Line3.png': 1920 / 1108,
  'Line4.png': 1920 / 1108,
  'Line5.png': 1920 / 1108,
  'Line6.png': 1920 / 1108,
  'Line7.png': 1920 / 1108,
  'Line8.png': 1920 / 1108,
  'Line9.png': 1920 / 1108,
  'Line12.png': 120 / 70,
  'KLIA.png': 1689 / 400,
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

function propText(properties) {
  return [
    properties.name,
    properties['name:en'],
    properties.full_name,
    properties.alt_name,
    properties.official_name,
    properties.network,
    properties.ref,
  ].filter(Boolean).join(' | ')
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

function networkMatches(properties, keys) {
  const haystack = norm([properties.network, properties.route, properties.name, properties['name:en']].filter(Boolean).join(' | '))
  return keys.some((key) => haystack.includes(norm(key)))
}

function stationCandidates(lineKeys) {
  return source.features.filter((feature) => {
    const type = feature.geometry?.type
    const properties = feature.properties || {}
    if (!['Point', 'Polygon', 'MultiPolygon'].includes(type)) return false
    if (!(properties.public_transport || properties.railway || properties.station)) return false
    if (lineKeys.includes('KLIA Aerotrain')) return norm(properties.network).includes('klia aerotrain')
    return networkMatches(properties, lineKeys)
  })
}

function allStationCandidates() {
  return source.features.filter((feature) => {
    const type = feature.geometry?.type
    const properties = feature.properties || {}
    return ['Point', 'Polygon', 'MultiPolygon'].includes(type) && (properties.public_transport || properties.railway || properties.station)
  })
}

function findStation(lineKeys, stationName) {
  const aliases = [stationName, ...(manualAliases[stationName] || [])].map(norm)
  const findExact = (candidates) => candidates.find((feature) => {
    const properties = feature.properties || {}
    return aliases.some((alias) =>
      [properties['name:en'], properties.name, properties.full_name, properties.alt_name, properties.official_name]
        .filter(Boolean)
        .map(norm)
        .some((name) => name === alias || name.endsWith(` ${alias}`)),
    )
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
    'name', 'name:en', 'name:ms', 'name:zh', 'name:zh-Hans', 'name:zh-Hant',
    'full_name', 'alt_name', 'official_name', 'ref',
  ]) {
    if (properties[key]) set.add(properties[key])
  }
  const chinese = properties['name:zh-Hans'] || properties['name:zh'] || properties['name:zh-Hant']
  if (chinese) set.add(pinyin(chinese, { toneType: 'none', type: 'array' }).join(' '))
  return [...set].filter(Boolean)
}

const lines = Object.fromEntries(lineDefs.map(([id, name, color, icon], order) => [
  id,
  {
    name,
    color,
    backgroundColor: color,
    textColor: color.toUpperCase() === '#FFCD00' || color.toUpperCase() === '#FAA831' || color.toUpperCase() === '#81CD23' || color.toUpperCase() === '#88CFFA' ? '#1F1F1F' : '#FFFFFF',
    progressOutlineColor: color,
    statsColor: color,
    order,
    icon: `asia/malaysia/kuala-lumpur/${icon}`,
    badgeShape: 'wide',
    badgeFit: 'contain',
    badgeAspectRatio: Number((badgeAspectRatios[icon] || 88 / 24).toFixed(4)),
  },
]))

const routeFeatures = []
lineDefs.forEach(([id, name, color, , keys], order) => {
  const matches = source.features.filter((feature) => {
    if (feature.geometry?.type !== 'LineString') return false
    const properties = feature.properties || {}
    if (id.includes('ERL')) return networkMatches(properties, ['KLIA Ekspres', 'KLIA Transit', 'ERL'])
    if (id.includes('Aerotrain')) return networkMatches(properties, ['APM'])
    return networkMatches(properties, keys)
  })
  matches.forEach((feature) => {
    routeFeatures.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: { line: id, name, color, order },
    })
  })
})

let nextId = 1
const stationFeatures = []
const missing = []
lineDefs.forEach(([lineId, , , , keys, stations]) => {
  stations.forEach((stationName, order) => {
    const feature = findStation(keys, stationName)
    if (!feature) {
      missing.push(`${lineId}: ${stationName}`)
      return
    }
    stationFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coordinateOverrides[`${lineId}:${stationName}`] ?? center(feature),
      },
      properties: {
        id: nextId,
        name: stationName,
        line: lineId,
        order,
        alternate_names: aliasesFrom(feature, stationName),
        ...(clusterKeys[`${lineId}:${stationName}`] ? { cluster_key: clusterKeys[`${lineId}:${stationName}`] } : {}),
      },
      id: nextId,
    })
    nextId += 1
  })
})

if (missing.length > 0) {
  console.error(`Missing station matches:\n${missing.join('\n')}`)
  process.exit(1)
}

fs.writeFileSync(path.join(dataDir, 'lines.json'), `${JSON.stringify(lines, null, 2)}\n`)
fs.writeFileSync(path.join(dataDir, 'routes.json'), `${JSON.stringify({ type: 'FeatureCollection', features: routeFeatures }, null, 2)}\n`)
fs.writeFileSync(path.join(dataDir, 'features.json'), `${JSON.stringify({ type: 'FeatureCollection', features: stationFeatures }, null, 2)}\n`)
console.log(`Generated ${Object.keys(lines).length} lines, ${routeFeatures.length} route segments, ${stationFeatures.length} station features.`)
