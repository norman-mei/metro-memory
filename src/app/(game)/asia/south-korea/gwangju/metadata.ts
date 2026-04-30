import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('gwangju', {
  icons: {
    icon: '/api/city-icon/gwangju',
    apple: '/api/city-icon/gwangju',
  },
  title: 'Gwangju Metro Memory',
  description: 'How many Gwangju Metro stops can you name from memory?',
  openGraph: {
    title: 'Gwangju Metro Memory',
    description: 'How many Gwangju Metro stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/south-korea/gwangju',
  },
})
