const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'src', 'app', '(game)', 'florida-state', 'data')

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const loadGeo = (relPath) => JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'))

const metroRailData = loadGeo('src/app/(game)/miami/MetroRailStations_gdb_5411433484224436877.geojson')
const metroMoverData = loadGeo('src/app/(game)/miami/MetroMoverStations_gdb_-3835313614667861263.geojson')
const brightlineData = loadGeo('src/app/(game)/miami/brightline_stations.geojson')
const sunrailData = loadGeo('src/app/(game)/miami/orlando_sunrail_stations.geojson')

const buildCoordMap = (features, getName) => {
  const map = new Map()
  features.forEach((feature) => {
    if (!feature || feature.geometry?.type !== 'Point') {
      return
    }
    const coords = feature.geometry.coordinates
    const rawName = getName(feature.properties) ?? ''
    const key = normalize(rawName)
    if (key) {
      map.set(key, coords)
    }
  })
  return map
}

const datasets = {
  metroRail: buildCoordMap(metroRailData.features, (props) => props.NAME),
  metroMover: buildCoordMap(metroMoverData.features, (props) => props.NAME),
  brightline: buildCoordMap(brightlineData.features, (props) => props.stop_name ?? props.stop_desc ?? ''),
  sunrail: buildCoordMap(sunrailData.features, (props) => props.stop_name ?? ''),
}

const toLonLat = (lat, lon) => [lon, lat]

const lineDefinitions = [
  {
    id: 'floridaGR',
    name: 'Metrorail Green Line',
    color: '#9DD165',
    backgroundColor: '#577F2A',
    textColor: '#1F1F1F',
    order: 0,
    stations: [
      'Palmetto',
      'Okeechobee',
      'Hialeah',
      { name: 'Tri-Rail', alternateNames: ['Tri-Rail Transfer'] },
      'Northside',
      { name: 'Dr. Martin Luther King, Jr. Plaza', alternateNames: ['Dr. Martin Luther King Jr Plaza', 'MLK Jr. Plaza'] },
      'Brownsville',
      'Earlington Heights',
      'Allapattah',
      'Santa Clara',
      { name: 'UHealth | Jackson', sourceName: 'UHEALTH / JACKSON' },
      'Culmer',
      { name: 'Historic Overtown/Lyric Theatre', alternateNames: ['Historic Overtown', 'Lyric Theatre'] },
      'Government Center',
      'Brickell',
      'Vizcaya',
      'Coconut Grove',
      'Douglas Road',
      'University',
      'South Miami',
      'Dadeland North',
      'Dadeland South',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'metroRail',
    })),
  },
  {
    id: 'floridaOR',
    name: 'Metrorail Orange Line',
    color: '#FE4D1A',
    backgroundColor: '#B5380F',
    textColor: '#FFFFFF',
    order: 1,
    stations: [
      { name: 'Miami International Airport', alternateNames: ['Miami Intl Airport Station', 'MIA Station'] },
      'Earlington Heights',
      'Allapattah',
      'Santa Clara',
      { name: 'UHealth | Jackson', sourceName: 'UHEALTH / JACKSON' },
      'Culmer',
      { name: 'Historic Overtown/Lyric Theatre', alternateNames: ['Historic Overtown', 'Lyric Theatre'] },
      'Government Center',
      'Brickell',
      'Vizcaya',
      'Coconut Grove',
      'Douglas Road',
      'University',
      'South Miami',
      'Dadeland North',
      'Dadeland South',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'metroRail',
    })),
  },
  {
    id: 'floridaOM',
    name: 'Metromover Omni Loop',
    color: '#0B58AF',
    backgroundColor: '#043267',
    textColor: '#FFFFFF',
    order: 2,
    loop: true,
    stations: [
      'Government Center',
      'Third Street',
      'Knight Center',
      'Bayfront Park',
      'First Street',
      'College/Bayside',
      'Freedom Tower',
      { name: 'Miami Worldcenter', sourceName: 'PARK WEST', alternateNames: ['Park West'] },
      'Eleventh Street',
      'Museum Park',
      'Adrienne Arsht Center',
      'School Board',
      'College North',
      'Wilkie D. Ferguson, Jr.',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'metroMover',
    })),
  },
  {
    id: 'floridaBR',
    name: 'Metromover Brickell Loop',
    color: '#FFB638',
    backgroundColor: '#B27800',
    textColor: '#1F1F1F',
    order: 3,
    loop: true,
    stations: [
      'Government Center',
      'Third Street',
      'Riverwalk',
      'Fifth Street',
      { name: 'Brickell City Centre (Eighth Street)', sourceName: 'EIGHTH STREET', alternateNames: ['Brickell City Centre', 'Eighth Street'] },
      'Tenth Street/Promenade',
      'Brickell',
      'Financial District',
      'Knight Center',
      'Bayfront Park',
      'First Street',
      'College/Bayside',
      'College North',
      'Wilkie D. Ferguson, Jr.',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'metroMover',
    })),
  },
  {
    id: 'floridaIN',
    name: 'Metromover Inner Loop',
    color: '#3AC2EE',
    backgroundColor: '#1E86A6',
    textColor: '#1F1F1F',
    order: 4,
    loop: true,
    stations: [
      'Government Center',
      'Miami Avenue',
      'Knight Center',
      'Bayfront Park',
      'First Street',
      'College/Bayside',
      'College North',
      'Wilkie D. Ferguson, Jr.',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'metroMover',
    })),
  },
  {
    id: 'brightline',
    name: 'Brightline',
    color: '#FFC700',
    backgroundColor: '#B38200',
    textColor: '#1F1F1F',
    order: 5,
    stations: [
      { name: 'MiamiCentral', alternateNames: ['Miami Central'] },
      'Aventura',
      'Fort Lauderdale',
      'Boca Raton',
      'West Palm Beach',
      { name: 'Stuart', coordinates: toLonLat(27.19579819798719, -80.25106710339332) },
      { name: 'Cocoa', coordinates: toLonLat(28.397616490908447, -80.75163373581597) },
      'Orlando',
    ].map((entry) => ({
      ...(typeof entry === 'string' ? { name: entry } : entry),
      source: 'brightline',
    })),
  },
  {
    id: 'Tri-Rail',
    name: 'Tri-Rail',
    color: '#1EA0C5',
    backgroundColor: '#0F6E87',
    textColor: '#FFFFFF',
    order: 6,
    stations: [
      { name: 'Mangonia Park', coordinates: toLonLat(26.758628429325206, -80.07675393027903) },
      { name: 'West Palm Beach', coordinates: toLonLat(26.713325498329596, -80.06234516777903) },
      { name: 'Lake Worth Beach', coordinates: toLonLat(26.616301861693447, -80.06915696625559) },
      { name: 'Boynton Beach', coordinates: toLonLat(26.55394450690122, -80.07067578086858) },
      { name: 'Delray Beach', coordinates: toLonLat(26.454454596357703, -80.09107018027531) },
      { name: 'Boca Raton', coordinates: toLonLat(26.3926405326474, -80.09956933633723) },
      { name: 'Deerfield Beach', coordinates: toLonLat(26.316952548092996, -80.12234661810959) },
      { name: 'Pompano Beach', coordinates: toLonLat(26.2723758298872, -80.13481379143273) },
      { name: 'Cypress Creek', coordinates: toLonLat(26.201233456811067, -80.15048563270449) },
      { name: 'Fort Lauderdale', coordinates: toLonLat(26.120092013950398, -80.17003006623781) },
      { name: 'Fort Lauderdale Airport', coordinates: toLonLat(26.061764749936536, -80.16574771590774) },
      { name: 'Sheridan Street', coordinates: toLonLat(26.0321308792865, -80.16802683775809) },
      { name: 'Hollywood', coordinates: toLonLat(26.01206215010851, -80.16776381010793) },
      { name: 'Golden Glades', coordinates: toLonLat(25.92166950895298, -80.21735217830351) },
      { name: 'Opa-locka', coordinates: toLonLat(25.900064101735733, -80.25293162517121) },
      { name: 'Metrorail Transfer', coordinates: toLonLat(25.846637856981108, -80.2597898627221), alternateNames: ['Tri-Rail Transfer'] },
      { name: 'Hialeah Market', coordinates: toLonLat(25.811291554165173, -80.25868008453145) },
      { name: 'Miami Airport', coordinates: toLonLat(25.797251642212977, -80.2582947780204) },
      { name: 'MiamiCentral', coordinates: toLonLat(25.780909123325543, -80.19617984478062), alternateNames: ['Miami Central'] },
    ],
  },
  {
    id: 'floridaSUN',
    name: 'SunRail',
    color: '#F6A01A',
    backgroundColor: '#B56B00',
    textColor: '#1F1F1F',
    order: 7,
    stations: [
      'DeLand',
      'DeBary',
      'Sanford',
      'Lake Mary',
      'Longwood',
      'Altamonte Springs',
      'Maitland',
      'Winter Park',
      'AdventHealth',
      'LYNX Central',
      'Church Street',
      'Orlando Health/Amtrak',
      'Sand Lake Road',
      'Meadow Woods',
      'Tupperware',
      'Kissimmee',
      'Poinciana',
    ].map((name) => ({ name, source: 'sunrail' })),
  },
  {
    id: 'DisneyDRR',
    name: 'Disneyland Railroad',
    color: '#B0142B',
    backgroundColor: '#6E091B',
    textColor: '#FFFFFF',
    order: 8,
    loop: true,
    stations: [
      { name: 'Main Street, USA', coordinates: toLonLat(28.41647677086155, -81.58132298092073), alternateNames: ['Main Street USA'] },
      { name: 'Frontierland', coordinates: toLonLat(28.419728398535444, -81.58509400810469) },
      { name: 'Fantasyland', coordinates: toLonLat(28.421065672078523, -81.57826487946701) },
    ],
  },
  {
    id: 'DisneyMKR',
    name: 'Magic Kingdom Resort Line',
    color: '#EB8833',
    backgroundColor: '#B25B1B',
    textColor: '#1F1F1F',
    order: 9,
    loop: true,
    stations: [
      { name: 'Transportation and Ticket Center', coordinates: toLonLat(28.405690354503772, -81.57947352808037), alternateNames: ['TTC', 'Transportation & Ticket Center'] },
      { name: 'Polynesian Village Resort', coordinates: toLonLat(28.404997829000262, -81.5852198283818), alternateNames: ["Disney's Polynesian Village Resort"] },
      { name: 'Grand Floridian Resort & Spa', coordinates: toLonLat(28.410881374685797, -81.58815078327068), alternateNames: ["Grand Floridian Resort", "Disney's Grand Floridian Resort"] },
      { name: 'Magic Kingdom', coordinates: toLonLat(28.41603635934426, -81.58238069525417), alternateNames: ['Magic Kingdom Park'] },
      { name: 'Contemporary Resort', coordinates: toLonLat(28.415212471556526, -81.57445681974019), alternateNames: ["Disney's Contemporary Resort"] },
    ],
  },
  {
    id: 'DisneyMKX',
    name: 'Magic Kingdom Express Line',
    color: '#EB8833',
    backgroundColor: '#B25B1B',
    textColor: '#1F1F1F',
    order: 10,
    stations: [
      { name: 'Transportation and Ticket Center', coordinates: toLonLat(28.405690354503772, -81.57947352808037), alternateNames: ['TTC', 'Transportation & Ticket Center'] },
      { name: 'Magic Kingdom', coordinates: toLonLat(28.41603635934426, -81.58238069525417), alternateNames: ['Magic Kingdom Park'] },
    ],
  },
  {
    id: 'DisneyEPC',
    name: 'EPCOT Line',
    color: '#EB8833',
    backgroundColor: '#B25B1B',
    textColor: '#1F1F1F',
    order: 11,
    stations: [
      { name: 'Transportation and Ticket Center', coordinates: toLonLat(28.405690354503772, -81.57947352808037), alternateNames: ['TTC', 'Transportation & Ticket Center'] },
      { name: 'EPCOT', coordinates: toLonLat(28.376855372831628, -81.54963290052292), alternateNames: ['Epcot'] },
    ],
  },
  {
    id: 'DisneySKY',
    name: 'Disney Skyliner',
    color: '#72BBDC',
    backgroundColor: '#3A86A9',
    textColor: '#1F1F1F',
    order: 12,
    stations: [
      { name: 'Caribbean Beach Resort', coordinates: toLonLat(28.359194402348784, -81.54492581312743), alternateNames: ["Disney's Caribbean Beach Resort"] },
      { name: 'Riviera Resort', coordinates: toLonLat(28.366052087468603, -81.54236836377831), alternateNames: ["Disney's Riviera Resort"] },
      { name: 'EPCOT', coordinates: toLonLat(28.370020688355364, -81.5534296592), alternateNames: ['Epcot'] },
      { name: 'Hollywood Studios', coordinates: toLonLat(28.359146400676448, -81.55701230397688), alternateNames: ["Disney's Hollywood Studios"] },
      {
        name: 'Art of Animation/Pop Century Resorts',
        coordinates: toLonLat(28.350424348551023, -81.54574178143595),
        alternateNames: [
          "Pop Century",
          "Art of Animation",
          "Pop Century Resort",
          "Art of Animation Resort",
        ],
      },
    ],
    customRoutes: [
      ['Caribbean Beach Resort', 'Riviera Resort', 'EPCOT'],
      ['Caribbean Beach Resort', 'Hollywood Studios'],
      ['Caribbean Beach Resort', 'Art of Animation/Pop Century Resorts'],
    ],
  },
  {
    id: 'floridaTECO',
    name: 'TECO Line Streetcar',
    color: '#F2992E',
    backgroundColor: '#B66A12',
    textColor: '#1F1F1F',
    order: 13,
    stations: [
      { name: 'Hattricks', coordinates: toLonLat(27.94526533217977, -82.45688363210186) },
      { name: 'Dick Greco Plaza', coordinates: toLonLat(27.941668872241205, -82.45482173538193) },
      { name: 'HSBC', coordinates: toLonLat(27.941926924661267, -82.45200664045171) },
      { name: 'Amalie Arena', coordinates: toLonLat(27.943480576800386, -82.4485751942016) },
      { name: 'The Florida Aquarium', coordinates: toLonLat(27.94582104430503, -82.44566838781984) },
      { name: 'York Street', coordinates: toLonLat(27.948237405390003, -82.4455537633387) },
      { name: 'Port Tampa Bay', coordinates: toLonLat(27.95165314489453, -82.44546782338523) },
      { name: 'Cadrecha Plaza', coordinates: toLonLat(27.960726478321924, -82.44554441928562) },
      { name: 'Streetcar Society', coordinates: toLonLat(27.961148256504927, -82.44334410446429) },
      { name: 'Centro Ybor', coordinates: toLonLat(27.96111983528914, -82.44126271347446) },
      { name: 'Centennial Park', coordinates: toLonLat(27.961091398860145, -82.4373144979206) },
    ],
  },
  {
    id: 'floridaSKYTRAIN',
    name: 'MIA Skytrain',
    color: '#0072CE',
    backgroundColor: '#003F78',
    textColor: '#FFFFFF',
    order: 14,
    stations: [
      { name: 'Station 1', coordinates: toLonLat(25.798198081318414, -80.27386651164582) },
      { name: 'Station 2', coordinates: toLonLat(25.79732619891256, -80.27658924271714) },
      { name: 'Station 3', coordinates: toLonLat(25.797193419708357, -80.27975474704887) },
      { name: 'Station 4', coordinates: toLonLat(25.79778594288399, -80.28364448920846) },
    ],
  },
  {
    id: 'floridaMET',
    name: 'MIA e Train',
    color: '#FF6A13',
    backgroundColor: '#C04B05',
    textColor: '#FFFFFF',
    order: 15,
    stations: [
      { name: 'Concourse E', coordinates: toLonLat(25.79503812012263, -80.27981375793509) },
      { name: 'Concourse E Satellite', coordinates: toLonLat(25.795256595277195, -80.28341974778631) },
    ],
  },
  {
    id: 'floridaMIA',
    name: 'MIA Mover',
    color: '#00AEEF',
    backgroundColor: '#007EAB',
    textColor: '#FFFFFF',
    order: 16,
    stations: [
      { name: 'Miami Intermodal Center', coordinates: toLonLat(25.796851333334665, -80.25917754941558) },
      { name: 'Central Terminal', coordinates: toLonLat(25.79516799326855, -80.27707388910606) },
    ],
  },
  {
    id: 'floridaASA',
    name: 'Airside A APM',
    color: '#006C9C',
    backgroundColor: '#004768',
    textColor: '#FFFFFF',
    order: 17,
    stations: [
      { name: 'Airside A', coordinates: toLonLat(27.97656519097299, -82.53264350593618) },
      { name: 'Main Terminal', coordinates: toLonLat(27.979667204890198, -82.53404312522369) },
    ],
  },
  {
    id: 'floridaASC',
    name: 'Airside C APM',
    color: '#008060',
    backgroundColor: '#005238',
    textColor: '#FFFFFF',
    order: 18,
    stations: [
      { name: 'Airside C', coordinates: toLonLat(27.982555922245375, -82.53233401233665) },
      { name: 'Main Terminal', coordinates: toLonLat(27.980498129334222, -82.53394525864972) },
    ],
  },
  {
    id: 'floridaASE',
    name: 'Airside E APM',
    color: '#E57E25',
    backgroundColor: '#A6530F',
    textColor: '#1F1F1F',
    order: 19,
    stations: [
      { name: 'Airside E', coordinates: toLonLat(27.98014421930563, -82.53773600271951) },
      { name: 'Main Terminal', coordinates: toLonLat(27.980101631855096, -82.5356582893311) },
    ],
  },
  {
    id: 'floridaASF',
    name: 'Airside F APM',
    color: '#8E44AD',
    backgroundColor: '#5B2A6F',
    textColor: '#FFFFFF',
    order: 20,
    stations: [
      { name: 'Airside F', coordinates: toLonLat(27.977198900405007, -82.53734376320237) },
      { name: 'Main Terminal', coordinates: toLonLat(27.979583882285908, -82.53541474390677) },
    ],
  },
  {
    id: 'floridaSKYCONNECT',
    name: 'SkyConnect',
    color: '#D0006F',
    backgroundColor: '#8B004B',
    textColor: '#FFFFFF',
    order: 21,
    stations: [
      { name: 'Main Terminal', coordinates: toLonLat(27.980038924993785, -82.53340588271293) },
      { name: 'Economy Parking', coordinates: toLonLat(27.9666370940455, -82.53561261369518) },
      { name: 'Rental Car Center', coordinates: toLonLat(27.963800944701447, -82.53557180298958) },
    ],
  },
  {
    id: 'floridaAS1',
    name: 'Airside 1 APM',
    color: '#009FD9',
    backgroundColor: '#036C92',
    textColor: '#FFFFFF',
    order: 22,
    stations: [
      { name: 'Airside 1', coordinates: toLonLat(28.434674125081866, -81.31415171469304) },
      { name: 'Terminal A & B', coordinates: toLonLat(28.431392227151882, -81.30977402528949), alternateNames: ['Terminal A', 'Terminal B'] },
    ],
  },
  {
    id: 'floridaAS2',
    name: 'Airside 2 APM',
    color: '#F15A29',
    backgroundColor: '#B73A0F',
    textColor: '#FFFFFF',
    order: 23,
    stations: [
      { name: 'Airside 2', coordinates: toLonLat(28.435152741747974, -81.30165466672379) },
      { name: 'Terminal A & B', coordinates: toLonLat(28.431407556222048, -81.30614460774505), alternateNames: ['Terminal A', 'Terminal B'] },
    ],
  },
  {
    id: 'floridaAS3',
    name: 'Airside 3 APM',
    color: '#6C4CE5',
    backgroundColor: '#4730A4',
    textColor: '#FFFFFF',
    order: 24,
    stations: [
      { name: 'Airside 3', coordinates: toLonLat(28.428038598740518, -81.31377822109434) },
      { name: 'Terminal A & B', coordinates: toLonLat(28.430966368196867, -81.3098112767809), alternateNames: ['Terminal A', 'Terminal B'] },
    ],
  },
  {
    id: 'floridaAS4',
    name: 'Airside 4 APM',
    color: '#1ABC9C',
    backgroundColor: '#0E7A68',
    textColor: '#FFFFFF',
    order: 25,
    stations: [
      { name: 'Airside 4', coordinates: toLonLat(28.427383874856098, -81.30154062291484) },
      { name: 'Terminal A & B', coordinates: toLonLat(28.431014143570472, -81.30617673253428), alternateNames: ['Terminal A', 'Terminal B'] },
    ],
  },
  {
    id: 'floridaTL',
    name: 'Terminal Link',
    color: '#F4C542',
    backgroundColor: '#B18C19',
    textColor: '#1F1F1F',
    order: 26,
    stations: [
      { name: 'Terminal A & B', coordinates: toLonLat(28.430591229038463, -81.3057055802727), alternateNames: ['Terminal A', 'Terminal B'] },
      { name: 'Terminal C', coordinates: toLonLat(28.412197508389024, -81.30877900523096), alternateNames: ['Intermodal Terminal'] },
    ],
  },
]

const resolveCoordinates = (station) => {
  if (station.coordinates) {
    return station.coordinates
  }
  const sourceKey = station.source || null
  if (!sourceKey) {
    throw new Error(`Missing coordinates for station ${station.name}`)
  }
  const dataset = datasets[sourceKey]
  if (!dataset) {
    throw new Error(`Unknown dataset ${sourceKey} for station ${station.name}`)
  }
  const lookupName = station.sourceName ?? station.name
  const coords = dataset.get(normalize(lookupName))
  if (!coords) {
    throw new Error(`Unable to find coordinates for ${station.name} using key ${lookupName}`)
  }
  return coords
}

let nextId = 0
const featureCollection = {
  type: 'FeatureCollection',
  features: [],
}

lineDefinitions.forEach((line) => {
  line.stations.forEach((station) => {
    const coords = resolveCoordinates(station)
    const feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {
        name: station.name,
        line: line.id,
        id: nextId,
      },
      id: nextId,
    }
    if (station.alternateNames && station.alternateNames.length > 0) {
      feature.properties.alternate_names = station.alternateNames
    }
    featureCollection.features.push(feature)
    station.__coords = coords
    nextId += 1
  })
})

fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(
  path.join(dataDir, 'features.json'),
  JSON.stringify(featureCollection, null, 2) + '\n',
)

const linesObject = lineDefinitions.reduce((acc, line) => {
  acc[line.id] = {
    name: line.name,
    color: line.color,
    backgroundColor: line.backgroundColor,
    textColor: line.textColor,
    order: line.order,
  }
  return acc
}, {})

fs.writeFileSync(
  path.join(dataDir, 'lines.json'),
  JSON.stringify(linesObject, null, 2) + '\n',
)

const routes = []
lineDefinitions.forEach((line) => {
  const stationLookup = new Map(
    line.stations.map((station) => [station.name, station.__coords]),
  )

  if (line.customRoutes && line.customRoutes.length > 0) {
    line.customRoutes.forEach((routeNames) => {
      const coords = routeNames.map((name) => {
        const entry = stationLookup.get(name)
        if (!entry) {
          throw new Error(`Missing coordinate for ${name} in custom route for ${line.id}`)
        }
        return entry
      })
      if (coords.length >= 2) {
        routes.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {
            line: line.id,
            color: line.color,
            order: line.order,
          },
        })
      }
    })
    return
  }

  const coords = line.stations.map((station) => station.__coords).filter(Boolean)
  if (coords.length < 2) {
    return
  }
  const pathCoords = [...coords]
  if (line.loop) {
    pathCoords.push(coords[0])
  }
  routes.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: pathCoords },
    properties: {
      line: line.id,
      color: line.color,
      order: line.order,
    },
  })
})

fs.writeFileSync(
  path.join(dataDir, 'routes.json'),
  JSON.stringify({ type: 'FeatureCollection', features: routes }, null, 2) + '\n',
)

console.log('Generated data for florida-state')
