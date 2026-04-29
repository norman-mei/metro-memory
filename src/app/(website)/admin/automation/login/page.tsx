import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

import AdminThemeSwitcher from '@/app/(website)/admin/automation/AdminThemeSwitcher'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import {
  getAutomationAdminUser,
  isAutomationAdminAuthenticated,
  isAutomationAdminConfigured,
} from '@/lib/adminAuth'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'Automation Review Login | Metro Memory',
}

export default async function AutomationAdminLoginPage() {
  if (await isAutomationAdminAuthenticated()) {
    redirect('/admin/automation')
  }

  const currentUser = await getCurrentUser()
  const adminUser = await getAutomationAdminUser()

  return (
    <div
      className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24"
      data-testid="automation-admin-login-page"
    >
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="flex min-h-[70vh] w-full items-center">
      <div className="w-full rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
              Admin access
            </p>
            <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
              Automation review panel
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Monthly AI and OSM sync runs land here for review, approval, apply,
              and revert workflows. Access now follows your approved Metro Memory
              account directly.
            </p>
          </div>
          <AdminThemeSwitcher />
        </div>

        {!isAutomationAdminConfigured() ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Set <code className="font-mono">AUTOMATION_ADMIN_ALLOWED_EMAILS</code> to
            enable admin access.
          </div>
        ) : !currentUser ? (
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Sign in with your Metro Memory account first. If that account is on
              the automation admin allowlist, you will be able to open the panel
              immediately.
            </p>
            <Link
              href="/account"
              data-testid="automation-admin-open-account"
              className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Open account page
            </Link>
          </div>
        ) : !adminUser ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            Signed in as <code className="font-mono">{currentUser.email}</code>, but this
            account is not on the automation admin allowlist.
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <p className="text-sm text-emerald-900 dark:text-emerald-200">
              Signed in as <code className="font-mono">{adminUser.email}</code>. This
              account is approved for automation admin access.
            </p>
            <Link
              href="/admin/automation"
              data-testid="automation-admin-open-panel"
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Continue to admin panel
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
