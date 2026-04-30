import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('budapest', {
  icons: {
    icon: '/api/city-icon/budapest',
    apple: '/api/city-icon/budapest',
  },
  title: 'Budapest Metro Memory',
  description: 'Hány metróállomást tudsz emlékezetből megnevezni?',
  openGraph: {
    title: 'Budapest Metro Memory',
    description:
      'Hány metróállomást tudsz emlékezetből megnevezni? Játszd a Budapest Metro Memory-t és tudd meg!',
    type: 'website',
    locale: 'hu_HU',
    url: 'https://metro-memory.xyz/europe/hungary/budapest',
  },
})
