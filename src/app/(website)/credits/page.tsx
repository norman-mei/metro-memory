import { Metadata } from 'next'
import CreditsContent from '@/components/CreditsContent'

export const metadata: Metadata = {
  title: 'Credits - Metro Memory',
  description:
    'Learn more about the people behind this fork of the Metro Memory game and the original project by Benjamin TD.',
}

export default function CreditsPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-gradient-to-b from-white to-zinc-50 px-4 py-12 dark:from-zinc-950 dark:to-zinc-900">
      <CreditsContent showBackLink />
    </main>
  )
}
