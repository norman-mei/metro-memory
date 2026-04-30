import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('stockholm', {
  icons: {
    icon: '/api/city-icon/stockholm',
    apple: '/api/city-icon/stockholm',
  },
  title: 'Stockholm Metro Memory',
  description: 'Hur bra kan du namnen på Stockholms tunnelbanestationer?',
  openGraph: {
    title: 'Stockholm Metro Memory',
    description: 'Hur bra kan du namnen på Stockholms tunnelbanestationer?',
    type: 'website',
    locale: 'sv_SE',
    url: 'https://metro-memory.xyz/europe/sweden/stockholm',
  },
})
