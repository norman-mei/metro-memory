import fs from 'fs'
import path from 'path'

import { hydrateRegistryCoverage } from './registryCoverage.ts'
import type { Registry } from './types.ts'

const ROOT = process.cwd()
const REGISTRY_DIR = path.join(ROOT, 'city-registry')

const main = () => {
  const entries = fs.readdirSync(REGISTRY_DIR).filter((file) => file.endsWith('.json'))
  let updatedFiles = 0
  let addedLines = 0
  let expandedKeywords = 0

  entries.forEach((file) => {
    const filePath = path.join(REGISTRY_DIR, file)
    const before = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Registry
    const after = hydrateRegistryCoverage(before)

    const beforeLineCount = before.lines?.length || 0
    const afterLineCount = after.lines?.length || 0
    addedLines += Math.max(0, afterLineCount - beforeLineCount)

    const beforeKeywordCount = (before.lines || []).reduce(
      (count, line) => count + (line.keywords?.length || 0),
      0,
    )
    const afterKeywordCount = (after.lines || []).reduce(
      (count, line) => count + (line.keywords?.length || 0),
      0,
    )
    expandedKeywords += Math.max(0, afterKeywordCount - beforeKeywordCount)

    const beforeSerialized = JSON.stringify(before)
    const afterSerialized = JSON.stringify(after)
    if (beforeSerialized === afterSerialized) return

    fs.writeFileSync(filePath, `${JSON.stringify(after, null, 2)}\n`)
    updatedFiles += 1
  })

  console.log(
    `Backfilled ${updatedFiles} registries, added ${addedLines} lines, and generated ${expandedKeywords} keywords.`,
  )
}

main()
