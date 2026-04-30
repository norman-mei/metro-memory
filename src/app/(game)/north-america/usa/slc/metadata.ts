import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('slc', {
  icons: {
    icon: '/api/city-icon/slc',
    apple: '/api/city-icon/slc',
  },
  title: 'Salt Lake City Metro Memory',
  description: 'How many of Salt Lake City\'s rail stops can you name from memory?',
  openGraph: {
    title: 'Salt Lake City Metro Memory',
    description: 'How many of Salt Lake City\'s rail stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/slc',
  },
})
