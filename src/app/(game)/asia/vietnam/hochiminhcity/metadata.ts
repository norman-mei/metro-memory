import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('hochiminhcity', {
  icons: {
    icon: '/api/city-icon/hochiminhcity',
    apple: '/api/city-icon/hochiminhcity',
  },
  title: 'Ho Chi Minh City Metro Memory',
  description: 'How many Ho Chi Minh City Metro stops can you name from memory?',
  openGraph: {
    title: 'Ho Chi Minh City Metro Memory',
    description: 'How many Ho Chi Minh City Metro stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/vietnam/hochiminhcity',
  },
})
