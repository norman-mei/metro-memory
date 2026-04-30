import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('dresden', {
  icons: {
    icon: '/api/city-icon/dresden',
    apple: '/api/city-icon/dresden',
  },
  title: 'Dresden Tram Memory',
  description: 'Wie viele Tram-Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'Dresden Tram Memory',
    description:
      'Wie viele Tram-Stationen können Sie auswendig nennen? Spielen Sie das Dresden Tram Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.xyz/Dresden',
  },
})
