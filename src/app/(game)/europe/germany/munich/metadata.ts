import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('munich', {
  icons: {
    icon: '/api/city-icon/munich',
    apple: '/api/city-icon/munich',
  },
  title: 'München Bahn Memory',
  description: 'Wie viele S- und U-Bahn Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'München Bahn Memory',
    description:
      'Wie viele S- und U-Bahn-Stationen können Sie auswendig nennen? Spielen Sie das München Bahn Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.com/europe/germany/munich',
  },
})
