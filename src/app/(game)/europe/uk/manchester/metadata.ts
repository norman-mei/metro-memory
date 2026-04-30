import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('manchester', {
  icons: {
    icon: '/api/city-icon/manchester',
    apple: '/api/city-icon/manchester',
  },
  title: 'Manchester Metrolink Memory',
  description: 'How many Manchester Metrolink stops can you name from memory?',
  openGraph: {
    title: 'Manchester Metrolink Memory',
    description: 'How many Manchester Metrolink stops can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/manchester',
  },
})
