import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('nanchang', {
  icons: {
    icon: '/api/city-icon/nanchang',
    apple: '/api/city-icon/nanchang',
  },
  title: 'Nanchang Rail Transit Metro Memory',
  description: "How many of Nanchang's metro stations can you name from memory?",
  openGraph: {
    title: 'Nanchang Rail Transit Metro Memory',
    description: "How many of Nanchang's metro stations can you name from memory?",
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/nanchang',
  },
})
