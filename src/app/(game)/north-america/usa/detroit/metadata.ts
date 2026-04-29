import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('detroit', {
  icons: {
    icon: '/api/city-icon/detroit',
    apple: '/api/city-icon/detroit',
  },
  title: 'Detroit Metro Memory',
  description:
    'How many of the Detroit QLine, People Mover, and ExpressTram stations can you name from memory?',
  openGraph: {
    title: 'Detroit Metro Memory',
    description:
      'How many of the Detroit QLine, People Mover, and ExpressTram stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/detroit',
  },
})
