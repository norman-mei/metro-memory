import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('wm', {
  icons: {
    icon: '/api/city-icon/wm',
    apple: '/api/city-icon/wm',
  },
  title: 'West Midlands Transport Memory Game',
  description: 'How many West Midlands Metro and Air-Rail Link stations can you name?',
  openGraph: {
    title: 'West Midlands Transport Memory Game',
    description: 'How many West Midlands Metro and Air-Rail Link stations can you name?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/wm',
  },
})
