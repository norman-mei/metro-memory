import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.2

export const LINES: {
  [name: string]: Line
} = {
  SeoulSubway1Hoseon: {
    name: '1호선',
    color: '#0D3692',
    backgroundColor: '#002446',
    textColor: '#FFFFFF',
    order: 0,
  },
  SeoulSubway2Hoseon: {
    name: '2호선',
    color: '#33A23D',
    backgroundColor: '#004923',
    textColor: '#FFFFFF',
    order: 1,
  },
  SeoulSubway3Hoseon: {
    name: '3호선',
    color: '#FE5B10',
    backgroundColor: '#8A2C08',
    textColor: '#FFFFFF',
    order: 2,
  },
  SeoulSubway4Hoseon: {
    name: '4호선',
    color: '#32A1C8',
    backgroundColor: '#005169',
    textColor: '#FFFFFF',
    order: 3,
  },
  SeoulSubway5Hoseon: {
    name: '5호선',
    color: '#8B50A4',
    backgroundColor: '#513153',
    textColor: '#FFFFFF',
    order: 4,
  },
  SeoulSubway6Hoseon: {
    name: '6호선',
    color: '#C55C1D',
    backgroundColor: '#4F2308',
    textColor: '#FFFFFF',
    order: 5,
  },
  SeoulSubway7Hoseon: {
    name: '7호선',
    color: '#54640D',
    backgroundColor: '#2E330C',
    textColor: '#FFFFFF',
    order: 6,
  },
  SeoulSubway8Hoseon: {
    name: '8호선',
    color: '#F51361',
    backgroundColor: '#721932',
    textColor: '#FFFFFF',
    order: 7,
  },
  SeoulSubway9Hoseon: {
    name: '9호선',
    color: '#AA9872',
    backgroundColor: '#473B25',
    textColor: '#FFFFFF',
    order: 8,
  },
  SeoulMTRGyeonggangseon: {
    name: '경강선',
    color: '#004FA2',
    backgroundColor: '#004367',
    textColor: '#FFFFFF',
    order: 9,
  },
  SeoulMTRGyeongyijungangseon: {
    name: '경의중앙선',
    color: '#72C7A6',
    backgroundColor: '#2C7056',
    textColor: '#FFFFFF',
    order: 10,
  },
  SeoulMTRGyeongcunseon: {
    name: '경춘선',
    color: '#0C8E72',
    backgroundColor: '#02483A',
    textColor: '#FFFFFF',
    order: 11,
  },
  SeoulAirportRailroadGonghangceoldo: {
    name: '공항철도',
    color: '#3681b7',
    backgroundColor: '#00364F',
    textColor: '#FFFFFF',
    order: 12,
  },
  SeoulMTRSuinbundangseon: {
    name: '수인분당선',
    color: '#e0a134',
    backgroundColor: '#875004',
    textColor: '#FFFFFF',
    order: 13,
  },
  SeoulMTRSinbundangseon: {
    name: '신분당선',
    color: '#DB0029',
    backgroundColor: '#5E0C1A',
    textColor: '#FFFFFF',
    order: 14,
  },
  SeoulIncheonMetroInceon1Hoseon: {
    name: '인천1호선',
    color: '#6E98BB',
    backgroundColor: '#2F4D65',
    textColor: '#FFFFFF',
    order: 15,
  },
  CM_SeoulIncheonMetro2_inceon2hoseon: {
    name: '인천2호선',
    color: '#ED8B00',
    backgroundColor: '#764000',
    textColor: '#FFFFFF',
    order: 16,
  },
  CM_SeoulLightRailTransit_gimpogoldeurain: {
    name: '김포골드라인',
    color: '#ad8605',
    backgroundColor: '#574302',
    textColor: '#FFFFFF',
    order: 17,
  },
  SeoulLightRailTransitSeohaeseon: {
    name: '서해선',
    color: '#81A914',
    backgroundColor: '#47620F',
    textColor: '#FFFFFF',
    order: 18,
  },
  SeoulLightRailTransitSinrimseon: {
    name: '신림선',
    color: '#6889ca',
    backgroundColor: '#274171',
    textColor: '#FFFFFF',
    order: 19,
  },
  SeoulLightRailTransitEverline: {
    name: '에버라인',
    color: '#4EA346',
    backgroundColor: '#285011',
    textColor: '#FFFFFF',
    order: 20,
  },
  SeoulLightRailTransitUisinseolgyeongjeonceol: {
    name: '우이신설경전철',
    color: '#b7c452',
    backgroundColor: '#606823',
    textColor: '#FFFFFF',
    order: 21,
  },
  SeoulLightRailTransitUijeongbu: {
    name: '의정부경전철',
    color: '#FDA600',
    backgroundColor: '#7F5400',
    textColor: '#FFFFFF',
    order: 22,
  },
}

export const METADATA: Metadata = {
  title: 'Seoul Metro Memory',
  // in korean
  description: '서울 지하철 역 이름을 외울 수 있을까요?',
  openGraph: {
    title: 'Seoul Metro Memory',
    description: '서울 지하철 역 이름을 외울 수 있을까요?',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://metro-memory.com/seoul',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clox61b80011o01qofw8s8hdv',
  bounds: [
    [126.764, 37.413],
    [127.191, 37.715],
  ],
  maxBounds: [
    [125.5, 36.5],
    [128.5, 38.5],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/6oE4gN8Ue0nE3QY5kp'

export const CITY_NAME = 'seoul'

export const LOCALE = 'ko'

const config = {
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
}

export default config
