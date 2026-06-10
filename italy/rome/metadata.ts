import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taw', {
  icons: {
    icon: '/api/city-icon/rome',
    apple: '/api/city-icon/rome',
    },
  title: 'Rome Metro Memory',
  description: 'Quante stazioni della metro di Roma riesci a ricordare?',
  openGraph: {
    title: 'Roma Metro Memory',
    description: 'Quante stazioni della metro di Roma riesci a ricordare?',
    type: 'website',
    locale: 'it_IT',
    url: 'https://metro-memory.xyz/europe/it/rome',
  },
})