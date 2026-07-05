'use client'

import CityDataGamePage from '@/components/CityDataGamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import { readUnavailableCityAccess } from '@/lib/unavailableCityAccess'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import config from './config'

export default function BeijingPreviewGate() {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const access = readUnavailableCityAccess()
    setHasAccess(access)

    if (!access) {
      router.replace('/')
    }
  }, [router])

  if (!hasAccess) {
    return null
  }

  return (
    <Provider value={config}>
      <Main className="min-h-screen">
        <CityDataGamePage slug="beijing" />
      </Main>
    </Provider>
  )
}