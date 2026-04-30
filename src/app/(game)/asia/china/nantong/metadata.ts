import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nantong', {
  icons: {
    icon: '/api/city-icon/nantong',
    apple: '/api/city-icon/nantong',
  },
  title: 'Nantong Rail Transit Memory Game',
  description: 'How many of the Nantong Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Nantong Rail Transit Memory Game',
    description: 'How many of the Nantong Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/nantong',
  },
})
