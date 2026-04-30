import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('tucson', {
  icons: {
    icon: '/api/city-icon/tucson',
    apple: '/api/city-icon/tucson',
  },
  title: 'Tucson Metro Memory',
  description: 'How many of the Sun Link streetcar stops can you name from memory?',
  openGraph: {
    title: 'Tucson Metro Memory',
    description: 'How many of the Sun Link streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/tucson',
  },
})
