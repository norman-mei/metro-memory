import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('sendai', {
  icons: {
    icon: '/api/city-icon/sendai',
    apple: '/api/city-icon/sendai',
  },
  title: 'Sendai (仙台) Metro Memory',
  description: 'How many Sendai City Transportation Bureau stations can you name from memory?',
  openGraph: {
    title: 'Sendai (仙台) Metro Memory',
    description: 'How many Sendai City Transportation Bureau stations can you name from memory?',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.xyz/asia/japan/sendai',
  },
})
