import { type Metadata } from 'next'

import { Providers } from '@/app/(website)/providers'
import { Layout } from '@/components/Layout'

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Metro Memory',
  },
  description: 'Metro Memory map-based station guessing game.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="flex min-h-screen w-full antialiased">
        <Layout>{children}</Layout>
      </div>
    </Providers>
  )
}
