import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('kyoto', {
  icons: {
    icon: '/api/city-icon/kyoto',
    apple: '/api/city-icon/kyoto',
  },
  title: 'Kyoto (京都) Metro Memory',
  description:
    'How many Kyoto Municipal Transportation Bureau, Keifuku Electric Railroad Co., Ltd, and Hieizan Railway stations can you name from memory?',
  openGraph: {
    title: 'Kyoto (京都) Metro Memory',
    description:
      'How many Kyoto Municipal Transportation Bureau, Keifuku Electric Railroad Co., Ltd, and Hieizan Railway stations can you name from memory?',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://metro-memory.xyz/asia/japan/kyoto',
  },
})
