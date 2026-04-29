import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('gba', {
  icons: {
    icon: '/api/city-icon/gba',
    apple: '/api/city-icon/gba',
  },
  title: 'Greater Bay Area Metro Memory',
  description: 'How many stations in the Greater Bay Area can you name?',
  openGraph: {
    title: 'Greater Bay Area Metro Memory',
    description: 'How many stations in the Greater Bay Area can you name?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/gba',
  },
})
