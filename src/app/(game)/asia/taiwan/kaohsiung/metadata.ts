import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('kaohsiung', {
  icons: {
    icon: '/api/city-icon/kaohsiung',
    apple: '/api/city-icon/kaohsiung',
  },
  title: 'Kaohsiung Metro Memory',
  description: 'How many of the Kaohsiung MRT and LRT stations can you name from memory?',
  openGraph: {
    title: 'Kaohsiung Metro Memory',
    description: 'How many of the Kaohsiung MRT and LRT stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/taiwan/kaohsiung',
  },
})
