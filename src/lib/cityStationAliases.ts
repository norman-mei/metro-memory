import montrealAliases from '@/data/station-aliases/montreal.json'
import californiaStateBartAliases from '@/data/station-aliases/california-state-bart.json'
import californiaStateLosAngelesAliases from '@/data/station-aliases/california-state-los-angeles.json'
import californiaStateSanDiegoAliases from '@/data/station-aliases/california-state-san-diego.json'
import torontoWaterlooAliases from '@/data/station-aliases/toronto-waterloo.json'

const CITY_STATION_ALIASES: Record<string, Record<string, string[]>> = {
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

export const getCityStationAliases = (city: string) => CITY_STATION_ALIASES[city] ?? {}
