// Scheduled research loop. Researches a rotating daily batch of cities so that,
// over time, the whole catalogue is refreshed hands-off. Override the batch with
// RESEARCH_CITY_SLUGS (comma-separated) or the size with RESEARCH_BATCH_SIZE.
import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import { runResearch } from '@/lib/research/pipeline'

function rotatingBatch(size: number): string[] {
  const all = Array.from(AVAILABLE_CITY_SLUGS)
  if (!all.length) return []
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const start = (dayIndex * size) % all.length
  const batch: string[] = []
  for (let i = 0; i < Math.min(size, all.length); i += 1) {
    batch.push(all[(start + i) % all.length])
  }
  return batch
}

async function main() {
  const size = Number(process.env.RESEARCH_BATCH_SIZE) || 5
  const explicit = (process.env.RESEARCH_CITY_SLUGS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const citySlugs = explicit.length ? explicit : rotatingBatch(size)
  if (!citySlugs.length) {
    console.log(JSON.stringify({ skipped: true, reason: 'no cities to research' }))
    return
  }

  const summary = await runResearch({ citySlugs, trigger: 'SCHEDULED' })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
