import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { listClaims, queueMetrics } from '@/lib/research/queue'

import ResearchWorkspace from './ResearchWorkspace'
import type { ClaimDTO, RunDTO } from './types'

export const metadata = {
  title: 'Research Console | Metro Memory',
}

export const dynamic = 'force-dynamic'

export default async function ResearchAdminPage() {
  if (!(await isAutomationAdminAuthenticated())) {
    redirect('/admin/research/login')
  }

  const [claims, metrics] = await Promise.all([
    listClaims({ status: 'PENDING', take: 300 }),
    queueMetrics(),
  ])

  const claimDTOs: ClaimDTO[] = claims.map((c) => ({
    id: c.id,
    citySlug: c.citySlug,
    claimType: c.claimType,
    title: c.title,
    summary: c.summary,
    confidence: c.confidence,
    lane: c.lane,
    status: c.status,
    reviewNotes: c.reviewNotes,
    createdAt: c.createdAt.toISOString(),
    evidence: c.evidence.map((e) => ({
      id: e.id,
      sourceUrl: e.sourceUrl,
      sourceTitle: e.sourceTitle,
      sourceDate: e.sourceDate ? e.sourceDate.toISOString() : null,
      excerpt: e.excerpt,
      tier: e.tier,
    })),
  }))

  const runDTOs: RunDTO[] = metrics.recentRuns.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    status: r.status,
    citySlugs: r.citySlugs,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    summary: (r.summaryJson as Record<string, unknown> | null) ?? null,
  }))

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:pl-24">
        <Suspense fallback={null}>
          <StandaloneSidebarNav />
        </Suspense>
        <ResearchWorkspace
          initialClaims={claimDTOs}
          initialRuns={runDTOs}
          metrics={{
            pending: metrics.pending,
            totals: metrics.totals,
          }}
        />
      </div>
    </div>
  )
}
