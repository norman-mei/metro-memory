import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nyc', {
  icons: {
    icon: '/api/city-icon/nyc',
    apple: '/api/city-icon/nyc',
  },
  title: 'New York Metro Rapid Transit Memory',
  description:
    'How many New York metro rapid transit stations can you name from memory?',
  openGraph: {
    title: 'New York Metro Rapid Transit Memory',
    description:
      'How many New York metro rapid transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/nyc',
  },
})
