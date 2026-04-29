import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('okc', {
  icons: {
    icon: '/api/city-icon/okc',
    apple: '/api/city-icon/okc',
  },
  title: 'Oklahoma City Metro Memory',
  description: 'How many of the OKC streetcar stops can you remember?',
  openGraph: {
    title: 'Oklahoma City Metro Memory',
    description: 'How many of the OKC streetcar stops can you remember?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/okc',
  },
})
