import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('cincinnati', {
  icons: {
    icon: '/api/city-icon/cincinnati',
    apple: '/api/city-icon/cincinnati',
  },
  title: 'Cincinnati Metro Memory',
  description:
    'How many of the Cincinnati Connector streetcar and airport people mover stops can you name from memory?',
  openGraph: {
    title: 'Cincinnati Metro Memory',
    description:
      'How many of the Cincinnati Connector streetcar and airport people mover stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/cincinnati',
  },
})
