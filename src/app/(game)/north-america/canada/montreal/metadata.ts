import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('montreal', {
  icons: {
    icon: '/api/city-icon/montreal',
    apple: '/api/city-icon/montreal',
  },
  title: 'Montreal Metro Memory Game',
  description: 'How many of the Montreal metro stations can you name from memory?',
  openGraph: {
    title: 'Montreal Metro Memory Game',
    description:
      'How many of the Montreal metro stations can you name from memory?',
    type: 'website',
    locale: 'en_CA',
    url: 'https://metro-memory.xyz/north-america/canada/montreal',
  },
})
