import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('jinhua', {
  icons: {
    icon: '/api/city-icon/jinhua',
    apple: '/api/city-icon/jinhua',
  },
  title: 'Jinhua Rail Transit Memory Game',
  description: 'How many Jinhua Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Jinhua Rail Transit Memory Game',
    description: 'How many Jinhua Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/jinhua',
  },
})
