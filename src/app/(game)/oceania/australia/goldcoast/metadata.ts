import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('goldcoast', {
  icons: {
    icon: '/api/city-icon/goldcoast',
    apple: '/api/city-icon/goldcoast',
  },
  title: 'Gold Coast G:link Memory',
  description: 'How many Gold Coast G:link stops can you name from memory?',
  openGraph: {
    title: 'Gold Coast G:link Memory',
    description: 'How many Gold Coast G:link stops can you name from memory?',
    type: 'website',
    locale: 'en_AU',
    url: 'https://metro-memory.com/oceania/australia/goldcoast',
  },
})
