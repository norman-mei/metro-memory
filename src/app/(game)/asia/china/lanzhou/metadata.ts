import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('lanzhou', {
  icons: {
    icon: '/api/city-icon/lanzhou',
    apple: '/api/city-icon/lanzhou',
  },
  title: 'Lanzhou Metro Memory Game',
  description: 'How many of the Lanzhou Metro stations can you name from memory?',
  openGraph: {
    title: 'Lanzhou Metro Memory Game',
    description: 'How many of the Lanzhou Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/lanzhou',
  },
})
