import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('elpaso', {
  icons: {
    icon: '/api/city-icon/elpaso',
    apple: '/api/city-icon/elpaso',
  },
  title: 'El Paso Metro Memory',
  description: 'How many of the El Paso Streetcar stops can you name from memory?',
  openGraph: {
    title: 'El Paso Metro Memory',
    description: 'How many of the El Paso Streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/elpaso',
  },
})
