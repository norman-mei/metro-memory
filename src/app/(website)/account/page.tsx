import AccountXpOverview from '@/app/(website)/account/AccountXpOverview'
import AccountDashboard from '@/app/(website)/account/panel'
import CompetitiveOverview from '@/app/(website)/account/CompetitiveOverview'
import { Button } from '@/components/Button'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import { Suspense } from 'react'

export const metadata = {
  title: 'Account | Metro Memory',
  description:
    'Create an account to sync your Metro Memory progress and achievements across devices.',
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mb-6 flex justify-start">
        <Button href="/?tab=cities" variant="secondary">
          Back to home
        </Button>
      </div>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <Suspense fallback={null}>
          <AccountXpOverview />
        </Suspense>
        <Suspense fallback={<div>Loading...</div>}>
          <AccountDashboard />
        </Suspense>
        <Suspense fallback={null}>
          <CompetitiveOverview />
        </Suspense>
      </div>
    </div>
  )
}
