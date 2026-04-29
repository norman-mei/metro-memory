import MetroMemoryHome from '@/components/MetroMemoryHome'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metro Memory',
  description: 'Metro Memory map-based station guessing game.',
}

export default function HomePage() {
  return <MetroMemoryHome />
}
