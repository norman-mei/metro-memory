import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('fukuoka', {
  icons: {
    icon: '/api/city-icon/fukuoka',
    apple: '/api/city-icon/fukuoka',
  },
  title: 'Fukuoka (福岡) Metro Memory',
  description: 'How many Fukuoka City Transportation Bureau stations can you name from memory?',
  openGraph: {
    title: 'Fukuoka (福岡) Metro Memory',
    description: 'How many Fukuoka City Transportation Bureau stations can you name from memory?',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.xyz/asia/japan/fukuoka',
  },
})
