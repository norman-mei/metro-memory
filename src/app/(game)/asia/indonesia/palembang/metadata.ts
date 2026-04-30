import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('palembang', {
  icons: {
    icon: '/api/city-icon/palembang',
    apple: '/api/city-icon/palembang',
  },
  title: 'Palembang LRT Memory Game',
  description: 'How many Palembang LRT stations can you name from memory?',
  openGraph: {
    title: 'Palembang LRT Memory Game',
    description: 'How many Palembang LRT stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/indonesia/palembang',
  },
})
