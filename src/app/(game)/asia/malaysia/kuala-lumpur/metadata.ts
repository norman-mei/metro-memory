import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('kuala-lumpur', {
  icons: {
    icon: '/api/city-icon/kuala-lumpur',
    apple: '/api/city-icon/kuala-lumpur',
  },
  title: 'Kuala Lumpur Metro Memory Game',
  description:
    'How many Kuala Lumpur LRT, MRT, Monorail, ERL, and airport people-mover stations can you name from memory?',
  openGraph: {
    title: 'Kuala Lumpur Metro Memory Game',
    description:
      'How many Kuala Lumpur LRT, MRT, Monorail, ERL, and airport people-mover stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/asia/malaysia/kuala-lumpur',
  },
})
