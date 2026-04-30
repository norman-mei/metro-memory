import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('guiyang', {
  icons: {
    icon: '/api/city-icon/guiyang',
    apple: '/api/city-icon/guiyang',
  },
  title: 'Guiyang Urban Rail Transit Metro Memory',
  description: "How many of Guiyang's metro and tram stations can you name from memory?",
  openGraph: {
    title: 'Guiyang Urban Rail Transit Metro Memory',
    description: "How many of Guiyang's metro and tram stations can you name from memory?",
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/guiyang',
  },
})
