import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nashville', {
  icons: {
    icon: '/api/city-icon/nashville',
    apple: '/api/city-icon/nashville',
  },
  title: 'Nashville Metro Memory',
  description:
    'How many of the Nashville WeGo Star stations can you name from memory?',
  openGraph: {
    title: 'Nashville Metro Memory',
    description:
      'How many of the Nashville WeGo Star stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/nashville',
  },
})
