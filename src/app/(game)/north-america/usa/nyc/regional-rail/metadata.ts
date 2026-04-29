import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('regional-rail', {
  icons: {
    icon: '/api/city-icon/nyc',
    apple: '/api/city-icon/nyc',
  },
  title: 'New York Regional Rail Memory',
  description: 'How many NY regional rail stations can you name from memory?',
  openGraph: {
    title: 'New York Regional Rail Memory',
    description: 'How many NY regional rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/nyc/regional-rail',
  },
})
