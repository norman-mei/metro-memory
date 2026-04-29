import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('dallas', {
  icons: {
    icon: '/api/city-icon/dallas',
    apple: '/api/city-icon/dallas',
  },
  title: 'Dallas–Fort Worth Metro Memory',
  description:
    'How many of the Dallas–Fort Worth DART, Trinity Metro, DCTA and Skylink stops can you name from memory?',
  openGraph: {
    title: 'Dallas–Fort Worth Metro Memory',
    description:
      'How many of the Dallas–Fort Worth DART, Trinity Metro, DCTA and Skylink stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/dallas',
  },
})
