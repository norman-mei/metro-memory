import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nottingham', {
  icons: {
    icon: '/api/city-icon/nottingham',
    apple: '/api/city-icon/nottingham',
  },
  title: 'Nottingham NET Memory',
  description: 'How many Nottingham Express Transit stops can you name?',
  openGraph: {
    title: 'Nottingham NET Memory',
    description: 'How many Nottingham Express Transit stops can you name?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/nottingham',
  },
})
