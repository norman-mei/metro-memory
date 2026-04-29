import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('daejeon', {
  icons: {
    icon: '/api/city-icon/daejeon',
    apple: '/api/city-icon/daejeon',
  },
  title: 'Daejeon Metro Memory Game',
  description: 'How many Daejeon Metro stations can you name from memory?',
  openGraph: {
    title: 'Daejeon Metro Memory Game',
    description: 'How many Daejeon Metro stations can you name from memory?',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://metro-memory.com/asia/south-korea/daejeon',
  },
})
