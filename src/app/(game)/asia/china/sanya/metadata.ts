import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('sanya', {
  icons: {
    icon: '/api/city-icon/sanya',
    apple: '/api/city-icon/sanya',
  },
  title: 'Sanya Tram Memory Game',
  description: 'How many Sanya Tram T1 stations can you name from memory?',
  openGraph: {
    title: 'Sanya Tram Memory Game',
    description: 'How many Sanya Tram T1 stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/sanya',
  },
})
