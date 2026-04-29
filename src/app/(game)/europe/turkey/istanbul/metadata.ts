import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('istanbul', {
  icons: {
    icon: '/api/city-icon/istanbul',
    apple: '/api/city-icon/istanbul',
  },
  title: 'Istanbul Metro Memory',
  description:
    'İstanbul metrosu hakkında bilgi edinin ve hafızanızı test edin.',
  openGraph: {
    title: 'Istanbul Metro Memory',
    description:
      'İstanbul metrosu hakkında bilgi edinin ve hafızanızı test edin.',
    type: 'website',
    locale: 'tr_TR',
    url: 'https://metro-memory.com/europe/turkey/istanbul',
  },
})
