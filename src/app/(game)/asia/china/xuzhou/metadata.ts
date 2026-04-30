import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('xuzhou', {
  icons: {
    icon: '/api/city-icon/xuzhou',
    apple: '/api/city-icon/xuzhou',
  },
  title: 'Xuzhou Metro Memory Game',
  description: 'How many Xuzhou Metro stations can you name from memory?',
  openGraph: {
    title: 'Xuzhou Metro Memory Game',
    description: 'How many Xuzhou Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/xuzhou',
  },
})
