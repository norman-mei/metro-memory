import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('lv', {
  icons: {
    icon: '/api/city-icon/lv',
    apple: '/api/city-icon/lv',
  },
  title: 'Las Vegas Metro Memory',
  description:
    'How many of the Las Vegas Monorail stations can you name from memory?',
  openGraph: {
    title: 'Las Vegas Metro Memory',
    description:
      'How many of the Las Vegas Monorail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/lv',
  },
})
