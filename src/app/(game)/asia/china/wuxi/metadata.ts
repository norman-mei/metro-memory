import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('wuxi', {
  icons: {
    icon: '/api/city-icon/wuxi',
    apple: '/api/city-icon/wuxi',
  },
  title: 'Wuxi Metro Memory Game',
  description: 'How many of the Wuxi Metro stations can you name from memory?',
  openGraph: {
    title: 'Wuxi Metro Memory Game',
    description: 'How many of the Wuxi Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/wuxi',
  },
})
