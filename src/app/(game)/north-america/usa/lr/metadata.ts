import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('lr', {
  icons: {
    icon: '/api/city-icon/lr',
    apple: '/api/city-icon/lr',
  },
  title: 'Little Rock Metro Memory',
  description: 'How many Little Rock Metro Streetcar stops can you name from memory?',
  openGraph: {
    title: 'Little Rock Metro Memory',
    description: 'How many Little Rock Metro Streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/lr',
  },
})
