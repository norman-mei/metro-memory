import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('sapporo', {
  icons: {
    icon: '/api/city-icon/sapporo',
    apple: '/api/city-icon/sapporo',
  },
  title: 'Sapporo (札幌) Metro Memory',
  description: 'How many Sapporo City Transportation Bureau stations can you name from memory?',
  openGraph: {
    title: 'Sapporo (札幌) Metro Memory',
    description: 'How many Sapporo City Transportation Bureau stations can you name from memory?',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.com/asia/japan/sapporo',
  },
})
