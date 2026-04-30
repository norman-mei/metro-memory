import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('barcelona', {
  icons: {
    icon: '/api/city-icon/barcelona',
    apple: '/api/city-icon/barcelona',
  },
  title: 'Barcelona Metro Memory',
  description:
    'Quantes estacions del metro de Barcelona pots nomenar de memòria? Prova aquest joc per descobrir-ho.',
  openGraph: {
    title: 'Barcelona Metro Memory',
    description:
      'Quantes estacions del metro de Barcelona pots nomenar de memòria? Prova aquest joc per descobrir-ho.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://metro-memory.xyz/europe/spain/barcelona',
  },
})
