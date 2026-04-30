import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('london', {
  icons: {
    icon: '/api/city-icon/london',
    apple: '/api/city-icon/london',
  },
  title: 'London Tube Memory Game',
  description: 'How many of the London Tube stations can you name from memory?',
  openGraph: {
    title: 'London Tube Memory Game',
    description:
      'How many of the London Tube stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/london',
  },
})
