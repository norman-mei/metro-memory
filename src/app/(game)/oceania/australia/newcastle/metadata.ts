import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('newcastle', {
  icons: {
    icon: '/api/city-icon/newcastle',
    apple: '/api/city-icon/newcastle',
  },
  title: 'Newcastle Metro Memory',
  description: 'How many of the Newcastle Light Rail stops can you name from memory?',
  openGraph: {
    title: 'Newcastle Metro Memory',
    description: 'How many of the Newcastle Light Rail stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/oceania/australia/newcastle',
  },
})
