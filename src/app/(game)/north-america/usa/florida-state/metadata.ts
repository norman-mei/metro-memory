import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('florida-state', {
  icons: {
    icon: '/api/city-icon/florida-state',
    apple: '/api/city-icon/florida-state',
  },
  title: 'Florida State Metro Memory',
  description: 'How many stations across Florida can you name from memory?',
  openGraph: {
    title: 'Florida State Metro Memory',
    description: 'How many stations across Florida can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/florida-state',
  },
})
