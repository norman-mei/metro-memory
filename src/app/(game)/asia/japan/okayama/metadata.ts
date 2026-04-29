import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('okayama', {
  icons: {
    icon: '/api/city-icon/okayama',
    apple: '/api/city-icon/okayama',
  },
  title: 'Okayama (岡山) Metro Memory',
  description:
    'How many Okayama Electric Tramway Co., Ltd. stations can you name from memory?',
  openGraph: {
    title: 'Okayama (岡山) Metro Memory',
    description:
      'How many Okayama Electric Tramway Co., Ltd. stations can you name from memory?',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.com/asia/japan/okayama',
  },
})
