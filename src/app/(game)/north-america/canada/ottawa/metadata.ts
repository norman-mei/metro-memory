import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('ottawa', {
  icons: {
    icon: '/api/city-icon/ottawa',
    apple: '/api/city-icon/ottawa',
  },
  title: 'Ottawa Metro Memory – OC Transpo',
  description: 'How many of the OC Transpo O-Train stations can you remember?',
  openGraph: {
    title: 'Ottawa Metro Memory – OC Transpo',
    description: 'How many of the OC Transpo O-Train stations can you remember?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/canada/ottawa',
  },
})
