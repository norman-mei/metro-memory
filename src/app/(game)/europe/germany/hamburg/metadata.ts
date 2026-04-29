import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('hamburg', {
  icons: {
    icon: '/api/city-icon/hamburg',
    apple: '/api/city-icon/hamburg',
  },
  title: 'Hamburg Bahn Memory',
  description: 'Wie viele S- und U-Bahn Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'Hamburg Bahn Memory',
    description:
      'Wie viele S- und U-Bahn-Stationen können Sie auswendig nennen? Spielen Sie das Hamburg Bahn Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.com/europe/germany/hamburg',
  },
})
