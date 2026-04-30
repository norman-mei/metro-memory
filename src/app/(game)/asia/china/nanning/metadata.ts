import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nanning', {
  icons: {
    icon: '/api/city-icon/nanning',
    apple: '/api/city-icon/nanning',
  },
  title: 'Nanning Rail Transit Metro Memory Game',
  description: 'How many of the Nanning Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Nanning Rail Transit Metro Memory Game',
    description: 'How many of the Nanning Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/nanning',
  },
})
