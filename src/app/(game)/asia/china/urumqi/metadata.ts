import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('urumqi', {
  icons: {
    icon: '/api/city-icon/urumqi',
    apple: '/api/city-icon/urumqi',
  },
  title: 'Ürümqi Metro Memory Game',
  description: 'How many of the Ürümqi Metro stations can you name from memory?',
  openGraph: {
    title: 'Ürümqi Metro Memory Game',
    description: 'How many of the Ürümqi Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/urumqi',
  },
})
