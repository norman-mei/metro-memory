import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taw', {
  icons: {
    icon: '/api/city-icon/taw',
    apple: '/api/city-icon/taw',
  },
  title: 'Tyne and Wear Metro Memory',
  description: 'How many Tyne and Wear Metro stops can you name from memory?',
  openGraph: {
    title: 'Tyne and Wear Metro Memory',
    description: 'How many Tyne and Wear Metro stops can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.com/europe/uk/taw',
  },
})
