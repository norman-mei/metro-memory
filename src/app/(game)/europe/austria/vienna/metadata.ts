import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('vienna', {
  icons: {
    icon: '/api/city-icon/vienna',
    apple: '/api/city-icon/vienna',
  },
  title: 'Wien U-Bahn Memory',
  description: 'Wie viele U-Bahn Stationen können Sie auswendig nennen?',
  openGraph: {
    title: 'Wien U-Bahn Memory',
    description:
      'Wie viele U-Bahn-Stationen können Sie auswendig nennen? Spielen Sie das Wien Bahn Memory und finden Sie es heraus!',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.com/europe/austria/vienna',
  },
})
