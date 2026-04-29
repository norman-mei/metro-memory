import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('singapore', {
  icons: {
    icon: '/api/city-icon/singapore',
    apple: '/api/city-icon/singapore',
  },
  title: 'Singapore Metro Memory Game',
  description:
    'How many of the Singapore MRT/LRT stations can you name from memory?',
  openGraph: {
    title: 'Singapore Metro Memory Game',
    description:
      'How many of the Singapore MRT/LRT stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.com/asia/singapore',
  },
})
