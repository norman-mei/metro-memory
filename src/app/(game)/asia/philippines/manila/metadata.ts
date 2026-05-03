import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('manila', {
  icons: {
    icon: '/api/city-icon/manila',
    apple: '/api/city-icon/manila',
  },
  title: 'Manila Metro Memory Game',
  description:
    'How many Manila LRT and MRT stations can you name from memory?',
  openGraph: {
    title: 'Manila Metro Memory Game',
    description:
      'How many Manila LRT and MRT stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/asia/philippines/manila',
  },
})
