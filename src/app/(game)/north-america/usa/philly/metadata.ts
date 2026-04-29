import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('philly', {
  icons: {
    icon: '/api/city-icon/philly',
    apple: '/api/city-icon/philly',
  },
  title: 'Philadelphia Transit Memory Game',
  description: 'How many of the Philadelphia transit stations can you name from memory?',
  openGraph: {
    title: 'Philadelphia Transit Memory Game',
    description: 'How many of the Philadelphia transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/philly',
  },
})
