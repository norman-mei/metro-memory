import { Suspense } from 'react'

import CampaignCatalogBrowser from '@/components/CampaignCatalogBrowser'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import { getCurrentUser } from '@/lib/auth'
import { ensureCampaignCatalog } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const user = await getCurrentUser()
  const campaigns = await ensureCampaignCatalog()
  const progress = user
    ? await prisma.campaignProgress.findMany({
        where: { userId: user.id },
      })
    : []
  const progressByCampaign = new Map(progress.map((entry) => [entry.campaignId, entry]))
  const campaignCards = campaigns.map((campaign) => {
    const userProgress = progressByCampaign.get(campaign.id)
    const completedCitySlugs = normalizeStringArray(userProgress?.completedCitySlugs)
    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description ?? '',
      themeColor: campaign.themeColor,
      cityCount: campaign.cities.length,
      completedCount: userProgress?.progressCount ?? 0,
      completed: Boolean(userProgress?.completedAt),
      cities: campaign.cities.map((city) => ({
        id: city.id,
        citySlug: city.citySlug,
        cityPath: city.cityPath,
        completed: completedCitySlugs.includes(city.citySlug),
      })),
    }
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Campaigns
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Region packs and curated routes
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Any valid unrevealed ranked clear contributes to every campaign that contains that city.
          </p>
        </div>

        <CampaignCatalogBrowser campaigns={campaignCards} hasUser={Boolean(user)} />
      </div>
    </div>
  )
}
