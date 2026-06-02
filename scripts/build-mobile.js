#!/usr/bin/env node

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const env = {
  ...process.env,
  METRO_MEMORY_CAPACITOR_EXPORT: '1',
  NEXT_PUBLIC_METRO_MOBILE_APP: '1',
  NEXT_TELEMETRY_DISABLED: '1',
}

const steps = [
  ['node', ['scripts/sync-city-assets.js']],
  ['node', ['scripts/sync-city-image-folders.js']],
  ['node', ['scripts/sync-city-icons.js']],
  ['node', ['scripts/sync-city-card-images.js']],
  ['node', ['scripts/export-city-data.js']],
  ['node', ['scripts/generate-offline-manifest.js']],
  ['next', ['build', '--webpack']],
]

const cleanStaleNextTypes = () => {
  const staleTypeDirs = [
    path.join(process.cwd(), '.next', 'dev', 'types'),
    path.join(process.cwd(), '.next', 'types'),
    path.join(process.cwd(), '.next-mobile', 'types'),
  ]
  for (const dir of staleTypeDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
}

const copyMapboxWorker = () => {
  const sourcePath = path.join(
    process.cwd(),
    'node_modules',
    'mapbox-gl',
    'dist',
    'mapbox-gl-csp-worker.js',
  )
  const destinationPath = path.join(
    process.cwd(),
    'public',
    'mapbox-gl-csp-worker.js',
  )
  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Could not find ${path.relative(process.cwd(), sourcePath)}. Run npm install before building mobile.`,
    )
  }
  fs.copyFileSync(sourcePath, destinationPath)
}

const stashTargets = [
  path.join(process.cwd(), 'src', 'app', 'api'),
  path.join(process.cwd(), 'src', 'app', '(game)', 'custom'),
  path.join(process.cwd(), 'src', 'app', '(website)', 'admin'),
].map((sourcePath, index) => ({
  sourcePath,
  stashPath: path.join(
    process.cwd(),
    `.next-mobile-route-stash-${process.pid}-${index}`,
  ),
}))

const stashPath = (sourcePath, stashPath) => {
  if (!fs.existsSync(sourcePath)) {
    return
  }
  fs.mkdirSync(path.dirname(stashPath), { recursive: true })
  try {
    fs.renameSync(sourcePath, stashPath)
  } catch (error) {
    if (error && error.code !== 'EXDEV') {
      throw new Error(
        `Could not temporarily move ${path.relative(process.cwd(), sourcePath)} for the mobile export. Close any dev servers or editors locking files in that folder and run npm run build:mobile again.`,
        { cause: error },
      )
    }
    try {
      fs.cpSync(sourcePath, stashPath, { recursive: true })
      fs.rmSync(sourcePath, { recursive: true, force: true })
    } catch (copyError) {
      if (fs.existsSync(stashPath)) {
        fs.rmSync(stashPath, { recursive: true, force: true })
      }
      throw copyError
    }
  }
}

const restorePath = (sourcePath, stashPath) => {
  if (!fs.existsSync(stashPath)) {
    return
  }
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
  if (fs.existsSync(sourcePath)) {
    try {
      fs.cpSync(stashPath, sourcePath, { recursive: true })
      fs.rmSync(stashPath, { recursive: true, force: true })
    } catch (error) {
      throw error
    }
    return
  }
  try {
    fs.renameSync(stashPath, sourcePath)
  } catch (error) {
    if (error && error.code !== 'EPERM' && error.code !== 'EXDEV') {
      throw error
    }
    fs.cpSync(stashPath, sourcePath, { recursive: true })
    fs.rmSync(stashPath, { recursive: true, force: true })
  }
}

const stashMobileOnlyRoutes = () => {
  stashTargets.forEach((target) => stashPath(target.sourcePath, target.stashPath))
  console.log('Temporarily stashed server-only routes for static mobile export')
}

const restoreMobileOnlyRoutes = () => {
  stashTargets
    .slice()
    .reverse()
    .forEach((target) => restorePath(target.sourcePath, target.stashPath))
}

let exitCode = 0

try {
  for (const [command, args] of steps) {
    if (command === 'next' && args[0] === 'build') {
      cleanStaleNextTypes()
      copyMapboxWorker()
      stashMobileOnlyRoutes()
    }

    const result = spawnSync(command, args, {
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    })
    if (result.status !== 0) {
      exitCode = result.status || 1
      break
    }
  }
} finally {
  restoreMobileOnlyRoutes()
}

process.exit(exitCode)
