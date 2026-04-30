import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('shenyang', {
  icons: {
    icon: '/api/city-icon/shenyang',
    apple: '/api/city-icon/shenyang',
  },
  title: 'Shenyang Metro Memory Game',
  description: 'How many of the Shenyang Metro and Tram stations can you name from memory?',
  openGraph: {
    title: 'Shenyang Metro Memory Game',
    description: 'How many of the Shenyang Metro and Tram stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/shenyang',
  },
})
