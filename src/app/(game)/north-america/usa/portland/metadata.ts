import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('portland', {
  icons: {
    icon: '/api/city-icon/portland',
    apple: '/api/city-icon/portland',
  },
  title: 'Portland Metro Memory',
  description: 'How many TriMet stations in the Portland region can you name from memory?',
  openGraph: {
    title: 'Portland Metro Memory',
    description: 'How many TriMet stations in the Portland region can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/portland',
  },
})
