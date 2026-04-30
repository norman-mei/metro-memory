import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('potsdam', {
  icons: {
    icon: '/api/city-icon/potsdam',
    apple: '/api/city-icon/potsdam',
  },
  title: 'Potsdam Tram Memory',
  description: 'Wie viele Tram-Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'Potsdam Tram Memory',
    description:
      'Wie viele Tram-Stationen können Sie auswendig nennen? Spielen Sie das Potsdam Tram Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.xyz/europe/germany/potsdam',
  },
})
