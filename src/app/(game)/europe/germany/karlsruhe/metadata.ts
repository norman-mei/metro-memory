import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('karlsruhe', {
  icons: {
    icon: '/api/city-icon/karlsruhe',
    apple: '/api/city-icon/karlsruhe',
  },
  title: 'Karlsruhe Tram(-Train) Memory',
  description:
    'How many of the Karlsruhe tram(-train) stations can you name from memory?',
  openGraph: {
    title: 'Karlsruhe Tram(-Train) Memory',
    description:
      'How many of the Karlsruhe tram(-train) stations can you name from memory?',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.xyz/europe/germany/karlsruhe',
  },
})
