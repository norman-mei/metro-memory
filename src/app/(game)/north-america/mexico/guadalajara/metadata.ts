import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('guadalajara', {
  icons: {
    icon: '/api/city-icon/guadalajara',
    apple: '/api/city-icon/guadalajara',
  },
  title: 'Guadalajara Metro Memory',
  description: 'How many Guadalajara Metro stations can you name from memory?',
  openGraph: {
    title: 'Guadalajara Metro Memory',
    description: 'How many Guadalajara Metro stations can you name from memory?',
    type: 'website',
    locale: 'es_MX',
    url: 'https://metro-memory.xyz/north-america/mexico/guadalajara',
  },
})
