import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('dalian', {
  icons: {
    icon: '/api/city-icon/dalian',
    apple: '/api/city-icon/dalian',
  },
  title: 'Dalian (大连) Metro Memory',
  description:
    'How many Dalian (大连) metro, tram, and Haida Cableway stops can you name from memory?',
  openGraph: {
    title: 'Dalian (大连) Metro Memory',
    description:
      'How many Dalian (大连) metro, tram, and Haida Cableway stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/dalian',
  },
})
