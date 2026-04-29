import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('changchun', {
  icons: {
    icon: '/api/city-icon/changchun',
    apple: '/api/city-icon/changchun',
  },
  title: 'Changchun Rail Transit Memory Game',
  description: 'How many of the Changchun Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Changchun Rail Transit Memory Game',
    description: 'How many of the Changchun Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/changchun',
  },
})
