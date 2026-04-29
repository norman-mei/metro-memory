import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('thsr', {
  icons: {
    icon: '/api/city-icon/thsr',
    apple: '/api/city-icon/thsr',
  },
  title: 'Taiwan High Speed Rail Metro Memory',
  description: 'How many Taiwan High Speed Rail stations can you name from memory?',
  openGraph: {
    title: 'Taiwan High Speed Rail Metro Memory',
    description: 'How many Taiwan High Speed Rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/taiwan/thsr',
  },
})
