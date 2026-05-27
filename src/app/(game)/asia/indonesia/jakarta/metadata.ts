import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('jakarta', {
  icons: {
    icon: '/api/city-icon/jakarta',
    apple: '/api/city-icon/jakarta',
  },
  title: 'Jakarta Metro Memory Game',
  description:
    'How many Jakarta MRT, LRT, airport rail, airport people-mover, and Ancol Dreamland stations can you name from memory?',
  openGraph: {
    title: 'Jakarta Metro Memory Game',
    description:
      'How many Jakarta MRT, LRT, airport rail, airport people-mover, and Ancol Dreamland stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/indonesia/jakarta',
  },
})
