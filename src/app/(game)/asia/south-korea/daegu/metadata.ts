import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('daegu', {
  icons: {
    icon: '/api/city-icon/daegu',
    apple: '/api/city-icon/daegu',
  },
  title: 'Daegu Metro Memory Game',
  description: 'How many Daegu Metro stations can you name from memory?',
  openGraph: {
    title: 'Daegu Metro Memory Game',
    description: 'How many Daegu Metro stations can you name from memory?',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://metro-memory.com/asia/south-korea/daegu',
  },
})
