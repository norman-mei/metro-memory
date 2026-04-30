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
      className="relative min-h-screen overflow-hidden bg-[#f4f1ea] dark:bg-[#09090b]"
      data-testid="automation-admin-login-page"
    >
      {/* Ambient gradient background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.14),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.3),_rgba(244,241,234,0))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_rgba(24,24,27,0.25),_rgba(9,9,11,0))]" />
      <div className="pointer-events-none fixed -top-24 right-[-8rem] z-0 h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-[110px] dark:bg-sky-500/10" />
      <div className="pointer-events-none fixed bottom-[-8rem] left-[-6rem] z-0 h-[20rem] w-[20rem] rounded-full bg-amber-300/10 blur-[120px] dark:bg-amber-500/10" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
        <Suspense fallback={null}>
          <StandaloneSidebarNav />
        </Suspense>

        <div className="flex min-h-[85vh] w-full items-center justify-center">
          <div className="w-full max-w-xl">
            {/* Main card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/88 p-8 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.55)] backdrop-blur sm:p-10 dark:border-white/10 dark:bg-zinc-950/72">
              {/* Decorative top accent */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500" />

              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/20">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
                      Admin access
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      Automation review panel
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      Monthly AI and OSM sync runs land here for review,
                      approval, apply, and revert workflows. Access follows your
                      approved Metro Memory account.
                    </p>
                  </div>
                </div>
                <AdminThemeSwitcher />
              </div>

              {/* Status section */}
              {!isAutomationAdminConfigured() ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                      <svg className="h-4 w-4 text-amber-700 dark:text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Not configured
                      </p>
                      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                        Set{' '}
                        <code className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
                          AUTOMATION_ADMIN_ALLOWED_EMAILS
                        </code>{' '}
                        to enable admin access.
                      </p>
                    </div>
                  </div>
                </div>
              ) : !currentUser ? (
                <div className="space-y-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <svg className="h-4 w-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Sign in required
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Sign in with your Metro Memory account first. If that
                        account is on the automation admin allowlist, you will be
                        able to open the panel immediately.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    data-testid="automation-admin-open-account"
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Open account page
                  </Link>
                </div>
              ) : !adminUser ? (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 p-5 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/50">
                      <svg className="h-4 w-4 text-rose-700 dark:text-rose-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-rose-900 dark:text-rose-100">
                        Access denied
                      </p>
                      <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
                        Signed in as{' '}
                        <code className="rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-xs dark:bg-rose-900/50">
                          {currentUser.email}
                        </code>
                        , but this account is not on the automation admin
                        allowlist.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                      <svg className="h-4 w-4 text-emerald-700 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        Access approved
                      </p>
                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                        Signed in as{' '}
                        <code className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-xs dark:bg-emerald-900/50">
                          {adminUser.email}
                        </code>
                        . This account is approved for automation admin access.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/automation"
                    data-testid="automation-admin-open-panel"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    Continue to admin panel
                  </Link>
                </div>
              )}
            </div>

            {/* Subtle bottom text */}
            <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
              Metro Memory Automation · Evidence-based transit data review
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
