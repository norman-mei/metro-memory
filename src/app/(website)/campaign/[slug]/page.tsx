import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import { ensureCampaignCatalog } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function CampaignPage({ params }: PageProps) {
  await ensureCampaignCatalog()
  const { slug } = await params
  const user = await getCurrentUser()

  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      cities: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!campaign) {
    notFound()
  }

  const progress = user
    ? await prisma.campaignProgress.findUnique({
        where: {
          userId_campaignId: {
            userId: user.id,
            campaignId: campaign.id,
          },
        },
      })
    : null
  const completedCitySlugs = normalizeStringArray(progress?.completedCitySlugs)

  return (
    <Container>
      <div className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-4">
          <Link href="/campaigns" className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400">
            Back to campaigns
          </Link>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: campaign.themeColor ?? 'var(--accent-600)' }}>
              Campaign
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{campaign.title}</h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400">{campaign.description}</p>
            {user ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Progress: {progress?.progressCount ?? 0}/{campaign.cities.length}
                {progress?.completedAt ? ` • completed ${new Date(progress.completedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}` : ''}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to track campaign progress.</p>
            )}
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Cities</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {campaign.cities.map((city, index) => (
              <div
                key={city.id}
                className={`rounded-2xl border px-4 py-3 ${completedCitySlugs.includes(city.citySlug) ? 'border-[var(--accent-600)] bg-[var(--accent-50)] dark:bg-[rgba(255,255,255,0.03)]' : 'border-zinc-100 dark:border-zinc-800'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Leg {index + 1}
                </p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{city.citySlug}</p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={city.cityPath}
                    className="text-sm font-semibold text-zinc-700 hover:underline dark:text-zinc-200"
                  >
                    Practice
                  </Link>
                  <Link
                    href={`${city.cityPath}?ranked=1&ruleset=classic&source=free-play`}
                    className="text-sm font-semibold text-[var(--accent-600)] hover:underline"
                  >
                    Ranked clear
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  )
}
