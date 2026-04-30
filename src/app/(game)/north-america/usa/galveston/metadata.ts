import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('galveston', {
  icons: {
    icon: '/api/city-icon/galveston',
    apple: '/api/city-icon/galveston',
  },
  title: 'Galveston Metro Memory',
  description: 'How many of the Galveston Island Trolley stops can you name from memory?',
  openGraph: {
    title: 'Galveston Metro Memory',
    description: 'How many of the Galveston Island Trolley stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/galveston',
  },
})
