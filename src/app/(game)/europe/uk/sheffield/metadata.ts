import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('sheffield', {
  icons: {
    icon: '/api/city-icon/sheffield',
    apple: '/api/city-icon/sheffield',
  },
  title: 'Sheffield Supertram Memory',
  description: 'How many Sheffield Supertram stops can you name from memory?',
  openGraph: {
    title: 'Sheffield Supertram Memory',
    description: 'How many Sheffield Supertram stops can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/sheffield',
  },
})
