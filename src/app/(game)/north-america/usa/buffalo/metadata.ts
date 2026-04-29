import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('buffalo', {
  icons: {
    icon: '/api/city-icon/buffalo',
    apple: '/api/city-icon/buffalo',
  },
  title: 'Buffalo Metro Memory',
  description:
    'How many of the Buffalo Metro Rail stations can you name from memory?',
  openGraph: {
    title: 'Buffalo Metro Memory',
    description:
      'How many of the Buffalo Metro Rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/buffalo',
  },
})
