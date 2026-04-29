import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('hohhot', {
  icons: {
    icon: '/api/city-icon/hohhot',
    apple: '/api/city-icon/hohhot',
  },
  title: 'Hohhot Metro Memory Game',
  description: 'How many of the Hohhot Metro stations can you name from memory?',
  openGraph: {
    title: 'Hohhot Metro Memory Game',
    description: 'How many of the Hohhot Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/hohhot',
  },
})
