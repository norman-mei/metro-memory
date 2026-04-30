import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('berlin', {
  icons: {
    icon: '/api/city-icon/berlin',
    apple: '/api/city-icon/berlin',
  },
  title: 'Berlin Bahn Memory',
  description: 'Wie viele S- und U-Bahn Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'Berlin Bahn Memory',
    description:
      'Wie viele S- und U-Bahn-Stationen können Sie auswendig nennen? Spielen Sie das Berlin Bahn Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.xyz/europe/germany/berlin',
  },
})
