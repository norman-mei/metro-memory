import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('busan', {
  icons: {
    icon: '/api/city-icon/busan',
    apple: '/api/city-icon/busan',
  },
  title: 'Busan Transportation Memory Game',
  description: 'How many Busan rail, sky capsule, and cable car stations can you name from memory?',
  openGraph: {
    title: 'Busan Transportation Memory Game',
    description: 'How many Busan rail, sky capsule, and cable car stations can you name from memory?',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://metro-memory.com/asia/south-korea/busan',
  },
})
