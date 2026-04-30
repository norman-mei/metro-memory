import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('shijiazhuang', {
  icons: {
    icon: '/api/city-icon/shijiazhuang',
    apple: '/api/city-icon/shijiazhuang',
  },
  title: 'Shijiazhuang Metro Memory',
  description: "How many of Shijiazhuang's metro stations can you name from memory?",
  openGraph: {
    title: 'Shijiazhuang Metro Memory',
    description: "How many of Shijiazhuang's metro stations can you name from memory?",
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/shijiazhuang',
  },
})
