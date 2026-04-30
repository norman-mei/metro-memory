import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('amtrak', {
  icons: {
    icon: '/api/city-icon/amtrak',
    apple: '/api/city-icon/amtrak',
  },
  title: 'Amtrak USA Rail Memory',
  description: 'How many Amtrak train stations in the United States can you name from memory?',
  openGraph: {
    title: 'Amtrak USA Rail Memory',
    description: 'How many Amtrak train stations in the United States can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/amtrak',
  },
})
