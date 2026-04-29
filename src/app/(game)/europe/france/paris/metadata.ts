import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('paris', {
  icons: {
    icon: '/api/city-icon/paris',
    apple: '/api/city-icon/paris',
  },
  title: 'Paris Métro Memory Game',
  description: 'How many of the Paris Métro stations can you name from memory?',
  openGraph: {
    title: 'Paris Métro Memory Game',
    description:
      'How many of the Paris Métro stations can you name from memory?',
    type: 'website',
    locale: 'fr_FR',
    url: 'https://metro-memory.com/europe/france/paris',
  },
})
