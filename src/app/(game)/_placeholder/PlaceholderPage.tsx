import { redirect } from 'next/navigation'

import { Config } from '@/lib/types'

export default function PlaceholderPage({ config: _config }: { config: Config }) {
  redirect('/')
  return null
}
