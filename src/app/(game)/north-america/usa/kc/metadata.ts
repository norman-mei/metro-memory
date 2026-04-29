import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('kc', {
  icons: {
    icon: '/api/city-icon/kc',
    apple: '/api/city-icon/kc',
  },
  title: 'Kansas City Metro Memory',
  description:
    'How many of the Kansas City Streetcar stations can you name from memory?',
  openGraph: {
    title: 'Kansas City Metro Memory',
    description:
      'How many of the Kansas City Streetcar stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/kc',
  },
})
