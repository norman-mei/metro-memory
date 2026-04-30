import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('canberra', {
  icons: {
    icon: '/api/city-icon/canberra',
    apple: '/api/city-icon/canberra',
  },
  title: 'Canberra Metro Memory',
  description: 'How many of the Canberra Metro stations can you name from memory?',
  openGraph: {
    title: 'Canberra Metro Memory',
    description: 'How many of the Canberra Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/oceania/australia/canberra',
  },
})
