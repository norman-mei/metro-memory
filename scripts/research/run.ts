// Manual research run: `node scripts/run-ts.js scripts/research/run.ts --cities=tokyo,osaka [--scope=...] [--trigger=MANUAL]`
import { runResearch } from '@/lib/research/pipeline'
import type { ResearchTriggerValue } from '@/lib/research/types'

function arg(name: string): string | undefined {
  const found = process.argv.find((v) => v.startsWith(`${name}=`))
  return found ? found.slice(name.length + 1) : undefined
}

function list(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function main() {
  const citySlugs = list(arg('--cities'))
  if (!citySlugs.length) {
    console.error('Usage: run.ts --cities=<slug,slug> [--scope=...] [--trigger=MANUAL|SCHEDULED|CHAT]')
    process.exit(1)
  }
  const scope = arg('--scope') || null
  const trigger = (arg('--trigger') as ResearchTriggerValue) || 'MANUAL'

  const summary = await runResearch({ citySlugs, scope, trigger })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
