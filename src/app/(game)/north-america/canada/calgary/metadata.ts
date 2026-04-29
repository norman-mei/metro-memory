import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('calgary', {
  icons: {
    icon: '/api/city-icon/calgary',
    apple: '/api/city-icon/calgary',
  },
  title: 'Calgary Metro Memory – CTrain',
  description: 'How many Calgary CTrain stations can you remember?',
  openGraph: {
    title: 'Calgary Metro Memory – CTrain',
    description: 'How many Calgary CTrain stations can you remember?',
    type: 'website',
    locale: 'en_CA',
    url: 'https://metro-memory.com/north-america/canada/calgary',
  },
})
