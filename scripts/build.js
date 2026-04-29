#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const nodeOptions = process.env.NODE_OPTIONS?.includes('--max-old-space-size')
  ? process.env.NODE_OPTIONS
  : [process.env.NODE_OPTIONS, '--max-old-space-size=4096']
      .filter(Boolean)
      .join(' ')

const env = {
  ...process.env,
  BROWSERSLIST_IGNORE_OLD_DATA: 'true',
  BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
  NODE_OPTIONS: nodeOptions,
  NEXT_TELEMETRY_DISABLED: '1',
  PRISMA_DISABLE_WARNINGS: 'true',
}

const steps = [
  ['node', ['scripts/sync-city-assets.js']],
  ['node', ['scripts/sync-city-image-folders.js']],
  ['node', ['scripts/sync-city-icons.js']],
  ['node', ['scripts/sync-city-card-images.js']],
  ['node', ['scripts/check-mojibake.js']],
  ['node', ['scripts/export-city-data.js']],
  ['node', ['scripts/generate-offline-manifest.js']],
  ['prisma', ['generate', '--no-hints']],
  ['node', ['scripts/patch-next-baseline-warning.js']],
  ['next', ['typegen']],
  ['next', ['build', '--webpack']],
]

const sourceDataRoot = path.join(process.cwd(), 'src', 'app', '(game)')
const stashRoot = path.join(process.cwd(), `.next-build-data-stash-${process.pid}`)

const stashedFiles = []

const walk = (dir, visitor) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(absolutePath, visitor)
    } else if (entry.isFile()) {
      visitor(absolutePath)
    }
  }
}

const stashLargeSourceData = () => {
  if (!fs.existsSync(sourceDataRoot) || stashedFiles.length > 0) {
    return
  }

  walk(sourceDataRoot, (absolutePath) => {
    if (
      path.extname(absolutePath) !== '.json' ||
      path.basename(absolutePath) === 'lines.json' ||
      !absolutePath.split(path.sep).includes('data')
    ) {
      return
    }

    const relativePath = path.relative(process.cwd(), absolutePath)
    const stashPath = path.join(stashRoot, relativePath)
    fs.mkdirSync(path.dirname(stashPath), { recursive: true })
    fs.renameSync(absolutePath, stashPath)
    stashedFiles.push([absolutePath, stashPath])
  })

  if (stashedFiles.length > 0) {
    console.log(`Temporarily stashed ${stashedFiles.length} source data files for Next build`)
  }
}

const restoreLargeSourceData = () => {
  for (const [absolutePath, stashPath] of stashedFiles.reverse()) {
    if (!fs.existsSync(stashPath)) {
      continue
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.renameSync(stashPath, absolutePath)
  }

  if (fs.existsSync(stashRoot)) {
    fs.rmSync(stashRoot, { recursive: true, force: true })
  }
}

let exitCode = 0

try {
  for (const [command, args] of steps) {
    if (command === 'next' && args[0] === 'typegen') {
      stashLargeSourceData()
    }

    const result = spawnSync(command, args, {
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    })

    if (result.status !== 0) {
      const detail = result.error
        ? `error ${result.error.message}`
        : result.signal
          ? `signal ${result.signal}`
          : `exit code ${result.status}`
      console.error(`Build step failed: ${command} ${args.join(' ')} (${detail})`)
      exitCode = result.status || 1
      break
    }
  }
} finally {
  restoreLargeSourceData()
}

process.exit(exitCode)
