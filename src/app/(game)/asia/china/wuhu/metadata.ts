import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('wuhu', {
  icons: {
    icon: '/api/city-icon/wuhu',
    apple: '/api/city-icon/wuhu',
  },
  title: 'Wuhu Rail Transit Memory Game',
  description: 'How many of the Wuhu Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Wuhu Rail Transit Memory Game',
    description: 'How many of the Wuhu Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/wuhu',
  },
})
