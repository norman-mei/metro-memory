import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('maracaibo', {
  icons: {
    icon: '/api/city-icon/maracaibo',
    apple: '/api/city-icon/maracaibo',
  },
  title: 'Maracaibo Metro Memory',
  description: 'How many of the Maracaibo Line 1 stations can you name from memory?',
  openGraph: {
    title: 'Maracaibo Metro Memory',
    description: 'How many of the Maracaibo Line 1 stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/south-america/venezuela/maracaibo',
  },
})
