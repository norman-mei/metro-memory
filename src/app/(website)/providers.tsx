'use client'

import { createContext, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import ThemeProviderClient from '@/components/ThemeProviderClient'

function usePrevious<T>(value: T) {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

export const AppContext = createContext<{ previousPathname?: string }>({})

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const previousPathname = usePrevious(pathname)

  return (
    <AppContext.Provider value={{ previousPathname }}>
      <ThemeProviderClient>{children}</ThemeProviderClient>
    </AppContext.Provider>
  )
}
