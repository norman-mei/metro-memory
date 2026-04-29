import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { ensureCampaignCatalog } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export async function GET() {
  const user = await getCurrentUser()
  const campaigns = await ensureCampaignCatalog()

  const progress = user
    ? await prisma.campaignProgress.findMany({
        where: { userId: user.id },
      })
    : []

  const progressByCampaign = new Map(progress.map((entry) => [entry.campaignId, entry]))

  return NextResponse.json({
    campaigns: campaigns.map((campaign) => {
      const userProgress = progressByCampaign.get(campaign.id)
      return {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        themeColor: campaign.themeColor,
        totalCities: campaign.cities.length,
        cities: campaign.cities.map((city) => ({
          citySlug: city.citySlug,
          cityPath: city.cityPath,
          orderIndex: city.orderIndex,
        })),
        progress: user
          ? {
              progressCount: userProgress?.progressCount ?? 0,
              completedAt: userProgress?.completedAt?.toISOString() ?? null,
              completedCitySlugs: normalizeStringArray(userProgress?.completedCitySlugs),
            }
          : null,
      }
    }),
  })
}
