#!/usr/bin/env node

const path = require('path')
const {
  DEFAULT_CATALOG_OUTPUT_DIR,
  ENGLISH_LOCALE,
  parseArgs,
  parseI18nSource,
  writeJson,
} = require('./i18n-shared')

const args = parseArgs(process.argv.slice(2))
const outputDir = path.resolve(String(args['output-dir'] || DEFAULT_CATALOG_OUTPUT_DIR))

const main = () => {
  const { supportedLanguages, locales } = parseI18nSource()
  const languageCodes = new Set(supportedLanguages.map((language) => language.code))

  Object.entries(locales).forEach(([locale, entries]) => {
    const counts = Object.values(entries).reduce(
      (acc, entry) => {
        acc[entry.kind] = (acc[entry.kind] ?? 0) + 1
        return acc
      },
      { text: 0, function: 0, template: 0, expression: 0 },
    )

    writeJson(path.join(outputDir, `${locale}.json`), {
      $schemaVersion: 1,
      locale,
      sourceLocale: ENGLISH_LOCALE,
      inSupportedLanguages: languageCodes.has(locale),
      generatedAt: new Date().toISOString(),
      counts,
      entries,
    })
  })

  writeJson(path.join(outputDir, 'index.json'), {
    $schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFile: 'src/lib/i18n.tsx',
    supportedLanguages,
    locales: Object.keys(locales),
  })

  console.log(`Extracted ${Object.keys(locales).length} locales to ${outputDir}`)
}

main()
