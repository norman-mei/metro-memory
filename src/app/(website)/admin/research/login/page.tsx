import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import {
  getAutomationAdminUser,
  isAutomationAdminAuthenticated,
  isAutomationAdminConfigured,
} from '@/lib/adminAuth'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'Research Console Login | Metro Memory',
}

export default async function ResearchAdminLoginPage() {
  if (await isAutomationAdminAuthenticated()) {
    redirect('/admin/research')
  }

  const currentUser = await getCurrentUser()
  const adminUser = await getAutomationAdminUser()

  let state: 'unconfigured' | 'signed-out' | 'denied' | 'approved' = 'approved'
  if (!isAutomationAdminConfigured()) state = 'unconfigured'
  else if (!currentUser) state = 'signed-out'
  else if (!adminUser) state = 'denied'

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 lg:pl-24">
        <Suspense fallback={null}>
          <StandaloneSidebarNav />
        </Suspense>

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
              Admin access
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Research console
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Review AI-researched transit updates: approve, reject, apply, or investigate.
              Access follows your approved Metro Memory account.
            </p>

            <div className="mt-8">
              {state === 'unconfigured' && (
                <Banner tone="amber" title="Not configured">
                  Set <Code>AUTOMATION_ADMIN_ALLOWED_EMAILS</Code> to enable admin access.
                </Banner>
              )}
              {state === 'signed-out' && (
                <div className="space-y-4">
                  <Banner tone="zinc" title="Sign in required">
                    Sign in with your Metro Memory account. If it&apos;s on the admin allowlist you
                    can open the console immediately.
                  </Banner>
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Open account page
                  </Link>
                </div>
              )}
              {state === 'denied' && (
                <Banner tone="rose" title="Access denied">
                  Signed in as <Code>{currentUser?.email}</Code>, but this account is not on the
                  admin allowlist.
                </Banner>
              )}
              {state === 'approved' && (
                <div className="space-y-4">
                  <Banner tone="emerald" title="Access approved">
                    Signed in as <Code>{adminUser?.email}</Code>.
                  </Banner>
                  <Link
                    href="/admin/research"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Continue to console
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
      {children}
    </code>
  )
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: 'amber' | 'rose' | 'emerald' | 'zinc'
  title: string
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    amber:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
    rose: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
    zinc: 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100',
  }
  return (
    <div className={`rounded-2xl border p-5 text-sm shadow-sm ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{children}</p>
    </div>
  )
}
