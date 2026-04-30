import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taizhou', {
  icons: {
    icon: '/api/city-icon/taizhou',
    apple: '/api/city-icon/taizhou',
  },
  title: 'Taizhou Rail Transit Metro Memory Game',
  description: 'How many of the Taizhou Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Taizhou Rail Transit Metro Memory Game',
    description: 'How many of the Taizhou Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/taizhou',
  },
})
