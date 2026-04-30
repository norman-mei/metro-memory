import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('edmonton', {
  icons: {
    icon: '/api/city-icon/edmonton',
    apple: '/api/city-icon/edmonton',
  },
  title: 'Edmonton Metro Memory – ETS LRT',
  description: 'How many Edmonton LRT stations can you remember from memory?',
  openGraph: {
    title: 'Edmonton Metro Memory – ETS LRT',
    description: 'How many Edmonton LRT stations can you remember from memory?',
    type: 'website',
    locale: 'en_CA',
    url: 'https://metro-memory.xyz/north-america/canada/edmonton',
  },
})
