import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taipei', {
  icons: {
    icon: '/api/city-icon/taipei',
    apple: '/api/city-icon/taipei',
  },
  title: 'Taipei Metro Memory',
  description:
    'How many Taipei Metro, New Taipei Metro, and Taoyuan Metro stations can you name from memory?',
  openGraph: {
    title: 'Taipei Metro Memory',
    description:
      'How many Taipei Metro, New Taipei Metro, and Taoyuan Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/taiwan/taipei',
  },
})
