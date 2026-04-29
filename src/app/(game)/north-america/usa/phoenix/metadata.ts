import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('phoenix', {
  icons: {
    icon: '/api/city-icon/phoenix',
    apple: '/api/city-icon/phoenix',
  },
  title: 'Phoenix-Tempe Metro Memory',
  description:
    'How many of the Phoenix-Tempe Valley Metro and PHX SkyTrain stops can you name from memory?',
  openGraph: {
    title: 'Phoenix-Tempe Metro Memory',
    description:
      'How many of the Phoenix-Tempe Valley Metro and PHX SkyTrain stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/phoenix',
  },
})
