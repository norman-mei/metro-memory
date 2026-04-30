import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('pyongyang', {
  icons: {
    icon: '/api/city-icon/pyongyang',
    apple: '/api/city-icon/pyongyang',
  },
  title: 'Pyongyang Metro Memory Game',
  description: 'How many of the Pyongyang Metro stations can you name from memory?',
  openGraph: {
    title: 'Pyongyang Metro Memory Game',
    description: 'How many of the Pyongyang Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/north-korea/pyongyang',
  },
})
