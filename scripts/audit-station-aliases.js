#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const [, , featuresPathArg] = process.argv

if (!featuresPathArg) {
  console.error('Usage: node scripts/audit-station-aliases.js <path-to-features.json>')
  process.exit(1)
}

const featuresPath = path.resolve(process.cwd(), featuresPathArg)
const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8'))
const features = Array.isArray(data.features) ? data.features : []

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\bsainte\b/g, 'ste')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bstation\b/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

const primaryNameOwners = new Map()

for (const feature of features) {
  const name = feature.properties?.name
  const key = normalize(name)
  if (!key) continue
  const owners = primaryNameOwners.get(key) || new Set()
  owners.add(name)
  primaryNameOwners.set(key, owners)
}

const collidesWithDifferentPrimaryName = (alias, originalName) => {
  const owners = primaryNameOwners.get(normalize(alias))
  if (!owners) return false
  return owners.size > 1 || !owners.has(originalName)
}

const shouldIncludeHyphenStandaloneSegment = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return false
  if (
    [
      'center',
      'centre',
      'central',
      'north',
      'south',
      'east',
      'west',
      'station',
      'gare',
      'saint',
      'sainte',
      'st',
      'ste',
      'nord',
      'sud',
      'est',
      'ouest',
    ].includes(normalized)
  ) {
    return false
  }
  const compact = normalized.replace(/[^a-z0-9]/gi, '')
  return compact.length >= 4 && /[a-z]/i.test(compact)
}

const addGeneratedAliases = (name, aliases) => {
  if (!name) return
  const strippedStation = name.replace(/\bstations?\b/gi, ' ').replace(/\s+/g, ' ').trim()
  if (strippedStation && strippedStation !== name) aliases.add(strippedStation)

  const saintShort = name
    .replace(/\bSainte\b/g, 'Ste')
    .replace(/\bSaint\b/g, 'St')
  if (saintShort !== name) aliases.add(saintShort)

  const connectorParts = name
    .split(/\s*(?:\/|&| - )\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (connectorParts.length > 1) {
    connectorParts.forEach((part) => {
      if (part.length > 3) aliases.add(part)
    })
  }

  const hyphenParts = name
    .split(/\s*[-–]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (hyphenParts.length === 2) {
    hyphenParts.forEach((part) => {
      const withoutState = part.split(',')[0]?.trim() || ''
      for (const candidate of [part, withoutState]) {
        if (
          shouldIncludeHyphenStandaloneSegment(candidate) &&
          !collidesWithDifferentHyphenSegment(candidate, name) &&
          !collidesWithDifferentPrimaryName(candidate, name)
        ) {
          aliases.add(candidate)
        }
      }
    })
  }
}

const hyphenSegmentOwners = new Map()

for (const feature of features) {
  const name = feature.properties?.name
  if (!name) continue
  const hyphenParts = name
    .split(/\s*[-–]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (hyphenParts.length !== 2) continue
  hyphenParts.forEach((part) => {
    const withoutState = part.split(',')[0]?.trim() || ''
    for (const candidate of [part, withoutState]) {
      if (!shouldIncludeHyphenStandaloneSegment(candidate)) continue
      const key = normalize(candidate)
      const owners = hyphenSegmentOwners.get(key) || new Set()
      owners.add(name)
      hyphenSegmentOwners.set(key, owners)
    }
  })
}

function collidesWithDifferentHyphenSegment(alias, originalName) {
  const owners = hyphenSegmentOwners.get(normalize(alias))
  if (!owners) return false
  return owners.size > 1 || !owners.has(originalName)
}

const acceptedInputs = new Map()
const connectorStations = []

for (const feature of features) {
  const properties = feature.properties || {}
  const id = feature.id ?? properties.id
  const name = properties.name
  const values = new Set(
    [name, properties.long_name, properties.short_name, ...(properties.alternate_names || [])]
      .filter((value) => typeof value === 'string' && value.trim()),
  )

  addGeneratedAliases(name, values)

  if (typeof name === 'string' && /\/|&|–| - /.test(name)) {
    connectorStations.push({ id, name })
  }

  for (const value of values) {
    const key = normalize(value)
    if (!key) continue
    const entries = acceptedInputs.get(key) || []
    entries.push({ id, station: name, input: value })
    acceptedInputs.set(key, entries)
  }
}

const collisions = Array.from(acceptedInputs.entries())
  .map(([key, entries]) => ({
    key,
    entries,
    stationCount: new Set(entries.map((entry) => `${entry.id}:${entry.station}`)).size,
  }))
  .filter((entry) => entry.stationCount > 1)
  .sort((a, b) => b.stationCount - a.stationCount || a.key.localeCompare(b.key))

console.log(`Audited ${features.length} features from ${featuresPathArg}`)
console.log(`Accepted normalized inputs: ${acceptedInputs.size}`)
console.log(`Potential collisions: ${collisions.length}`)

for (const collision of collisions.slice(0, 50)) {
  console.log(`\n${collision.key}`)
  for (const entry of collision.entries) {
    console.log(`  - ${entry.station} [${entry.id}] via "${entry.input}"`)
  }
}

if (connectorStations.length > 0) {
  console.log(`\nConnector-style station names: ${connectorStations.length}`)
  connectorStations.slice(0, 50).forEach((entry) => {
    console.log(`  - ${entry.name} [${entry.id}]`)
  })
}
