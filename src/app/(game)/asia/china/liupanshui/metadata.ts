import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('liupanshui', {
  icons: {
    icon: '/api/city-icon/liupanshui',
    apple: '/api/city-icon/liupanshui',
  },
  title: 'Liupanshui Tourism Monorail Memory Game',
  description: 'How many Liupanshui Tourism Monorail stations can you name from memory?',
  openGraph: {
    title: 'Liupanshui Tourism Monorail Memory Game',
    description: 'How many Liupanshui Tourism Monorail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/liupanshui',
  },
})
