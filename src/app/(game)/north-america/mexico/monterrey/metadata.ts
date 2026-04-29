import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('monterrey', {
  icons: {
    icon: '/api/city-icon/monterrey',
    apple: '/api/city-icon/monterrey',
  },
  title: 'Monterrey Metro Memory',
  description: 'How many Monterrey Metro stations can you name from memory?',
  openGraph: {
    title: 'Monterrey Metro Memory',
    description: 'How many Monterrey Metro stations can you name from memory?',
    type: 'website',
    locale: 'es_MX',
    url: 'https://metro-memory.com/north-america/mexico/monterrey',
  },
})
