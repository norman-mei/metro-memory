import { type Metadata } from 'next'
import { headers } from 'next/headers'

import { Providers } from '@/app/(website)/providers'
import { Layout } from '@/components/Layout'
import { getRequestLocaleDefaults } from '@/lib/requestLocaleDefaults'

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Metro Memory',
  },
  description: 'Metro Memory map-based station guessing game.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestLocaleDefaults = getRequestLocaleDefaults(await headers())

  return (
    <Providers requestLocaleDefaults={requestLocaleDefaults}>
      <div className="flex min-h-screen w-full antialiased">
        <Layout>{children}</Layout>
      </div>
    </Providers>
  )
}
