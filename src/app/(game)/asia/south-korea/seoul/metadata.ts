import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('seoul', {
  icons: {
    icon: '/api/city-icon/seoul',
    apple: '/api/city-icon/seoul',
  },
  title: 'Seoul Metro Memory',
  // in korean
  description: '서울 지하철 역 이름을 외울 수 있을까요?',
  openGraph: {
    title: 'Seoul Metro Memory',
    description: '서울 지하철 역 이름을 외울 수 있을까요?',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://metro-memory.com/asia/south-korea/seoul',
  },
})
