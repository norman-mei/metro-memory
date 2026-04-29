import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('glasgow', {
  icons: {
    icon: '/api/city-icon/glasgow',
    apple: '/api/city-icon/glasgow',
  },
  title: 'Glasgow Subway Memory Game',
  description: 'How many Glasgow Subway stations can you name from memory?'
,
  openGraph: {
    title: 'Glasgow Subway Memory Game',
    description: 'How many Glasgow Subway stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.com/europe/uk/glasgow',
  },
})
