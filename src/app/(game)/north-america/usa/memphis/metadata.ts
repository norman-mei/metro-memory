import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('memphis', {
  icons: {
    icon: '/api/city-icon/memphis',
    apple: '/api/city-icon/memphis',
  },
  title: 'Memphis Metro Memory',
  description:
    'How many of the Memphis MATA Trolley stops can you name from memory?',
  openGraph: {
    title: 'Memphis Metro Memory',
    description:
      'How many of the Memphis MATA Trolley stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/memphis',
  },
})
