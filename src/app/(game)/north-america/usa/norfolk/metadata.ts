import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('norfolk', {
  icons: {
    icon: '/api/city-icon/norfolk',
    apple: '/api/city-icon/norfolk',
  },
  title: 'Norfolk Metro Memory',
  description:
    'How many of the Norfolk Tide light rail stations can you name from memory?',
  openGraph: {
    title: 'Norfolk Metro Memory',
    description:
      'How many of the Norfolk Tide light rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/norfolk',
  },
})
