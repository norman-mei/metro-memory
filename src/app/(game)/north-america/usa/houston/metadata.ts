import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('houston', {
  icons: {
    icon: '/api/city-icon/houston',
    apple: '/api/city-icon/houston',
  },
  title: 'Houston Metro Memory',
  description:
    'How many of the Houston METRORail and HAS airport train stations can you name from memory?',
  openGraph: {
    title: 'Houston Metro Memory',
    description:
      'How many of the Houston METRORail and HAS airport train stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/houston',
  },
})
