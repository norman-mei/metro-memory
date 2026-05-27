import montrealAliases from '@/data/station-aliases/montreal.json'
import californiaStateBartAliases from '@/data/station-aliases/california-state-bart.json'
import californiaStateLosAngelesAliases from '@/data/station-aliases/california-state-los-angeles.json'
import californiaStateSanDiegoAliases from '@/data/station-aliases/california-state-san-diego.json'
import torontoWaterlooAliases from '@/data/station-aliases/toronto-waterloo.json'
import { getMiniCityBySlug, getMiniCitiesForParent } from '@/lib/miniCities'

type CityStationAliasMap = Record<string, string[]>

const CITY_STATION_ALIASES: Record<string, CityStationAliasMap> = {
  'california-state': {
    ...californiaStateBartAliases,
    ...californiaStateLosAngelesAliases,
    ...californiaStateSanDiegoAliases,
  },
  'california-state-bart': californiaStateBartAliases,
  'california-state-bay-area': californiaStateBartAliases,
  'california-state-la-metro': californiaStateLosAngelesAliases,
  'california-state-los-angeles': californiaStateLosAngelesAliases,
  'california-state-metrolink': californiaStateLosAngelesAliases,
  'california-state-san-diego': californiaStateSanDiegoAliases,
  buffalo: {
    Seneca: [
      'Merchants Insurance',
      'Merchants Insurance @ Seneca',
    ],
  },
  chicago: {
    'Jefferson Park Transit Center': [
      'Jefferson Park',
      'Jefferson Pk',
      'Jefferson Pk.',
    ],
  },
  edinburgh: {
    'Edinburgh Airport': [
      'airport',
      'edi',
      'egph',
    ],
  },
  'gba-hong-kong': {
    'Terminal 1 West Hall (一號客運大樓西大堂站)': [
      'T1',
      'Terminal 1',
      'West Hall',
    ],
  },
  montreal: montrealAliases,
  seattle: {
    '12th & Jackson': [
      '12th and Jackson',
      '12th & Jackson / Little Saigon',
      '12th and Jackson / Little Saigon',
      '12th & Jackson Little Saigon',
      '12th and Jackson Little Saigon',
    ],
    '14th & Washington Central District': [
      '14th & Washington',
      '14th and Washington',
      '14th & Washington / Central District',
      '14th and Washington / Central District',
    ],
    'Broadway & Howell': [
      'Broadway & Denny',
      'Broadway and Denny',
      'Broadway Denny',
      'Broadway & Denny Way',
      'Broadway and Denny Way',
      'Broadway Denny Way',
    ],
  },
  'toronto-waterloo': torontoWaterlooAliases,
  'toronto-waterloo-go-up': torontoWaterlooAliases,
  'toronto-waterloo-metrolinx': torontoWaterlooAliases,
  'toronto-waterloo-ttc': torontoWaterlooAliases,
  'toronto-waterloo-ttc-streetcars': torontoWaterlooAliases,
}

const mergeAliasMaps = (
  base: CityStationAliasMap,
  overrides: CityStationAliasMap,
): CityStationAliasMap => {
  const merged: CityStationAliasMap = { ...base }

  Object.entries(overrides).forEach(([stationName, aliases]) => {
    const existingAliases = merged[stationName] ?? []
    merged[stationName] = Array.from(new Set([...existingAliases, ...aliases]))
  })

  return merged
}

export const getCityStationAliases = (city: string) => {
  const miniCity = getMiniCityBySlug(city)
  const familyRootSlug = miniCity?.parentSlug ?? city
  const familySlugs = [
    familyRootSlug,
    ...getMiniCitiesForParent(familyRootSlug).map((entry) => entry.slug),
  ]

  return familySlugs.reduce<CityStationAliasMap>((merged, slug) => {
    const aliases = CITY_STATION_ALIASES[slug] ?? {}
    return mergeAliasMaps(merged, aliases)
  }, {})
}
