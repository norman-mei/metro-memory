import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Metro Memory',
  description: 'Metro Memory map-based station guessing game.',
}

export default function MetroMemoryPage() {
  redirect('/')
}
