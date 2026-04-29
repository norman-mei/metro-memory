import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('tokyo', {
  icons: {
    icon: '/api/city-icon/tokyo',
    apple: '/api/city-icon/tokyo',
  },
  title: 'Tokyo Metro Memory',
  // in japanese
  description: '東京メトロの駅名を覚えられますか？',
  openGraph: {
    title: 'Tokyo Metro Memory',
    description: '東京メトロの駅名を覚えられますか？',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.com/asia/japan/tokyo',
  },
})
