import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('seattle', {
  icons: {
    icon: '/api/city-icon/seattle',
    apple: '/api/city-icon/seattle',
  },
  title: 'Seattle—Tacoma Metro Memory',
  description: 'Test your knowledge of Puget Sound transit lines from Link to SEA Underground.',
  openGraph: {
    title: 'Seattle—Tacoma Metro Memory',
    description: 'Test your knowledge of Puget Sound transit lines from Link to SEA Underground.',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/seattle',
  },
})
