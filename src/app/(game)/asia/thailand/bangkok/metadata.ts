import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('bangkok', {
  icons: {
    icon: '/api/city-icon/bangkok',
    apple: '/api/city-icon/bangkok',
  },
  title: 'Bangkok Metro Memory Game',
  description:
    'How many Bangkok MRT, BTS, Airport Rail Link, and SRT Red Line stations can you name from memory?',
  openGraph: {
    title: 'Bangkok Metro Memory Game',
    description:
      'How many Bangkok MRT, BTS, Airport Rail Link, and SRT Red Line stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/asia/thailand/bangkok',
  },
})
