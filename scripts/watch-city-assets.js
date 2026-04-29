#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const WATCH_ROOT = path.join(ROOT, 'public', 'images')
const DEBOUNCE_MS = 250

let debounceTimer = null
let syncRunning = false
let syncQueued = false

function log(message) {
  console.log(`[watch-city-assets] ${message}`)
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function runSync() {
  if (syncRunning) {
    syncQueued = true
    return
  }

  syncRunning = true
  log('syncing changed city assets...')

  const assetCode = await runCommand(process.execPath, [
    path.join(__dirname, 'sync-city-assets.js'),
  ])
  const cardCode = await runCommand(process.execPath, [
    path.join(__dirname, 'sync-city-card-images.js'),
  ])

  if (assetCode === 0 && cardCode === 0) {
    log('asset sync complete')
  } else {
    log(`asset sync finished with codes assets=${assetCode} cards=${cardCode}`)
  }

  syncRunning = false
  if (syncQueued) {
    syncQueued = false
    void runSync()
  }
}

function scheduleSync(reason) {
  log(`change detected (${reason}), scheduling sync`)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runSync()
  }, DEBOUNCE_MS)
}

function startWatcher() {
  if (!fs.existsSync(WATCH_ROOT)) {
    log(`watch root missing: ${WATCH_ROOT}`)
    return null
  }

  try {
    const watcher = fs.watch(
      WATCH_ROOT,
      { persistent: true, recursive: true },
      (eventType, filename) => {
        if (!filename) {
          scheduleSync(eventType)
          return
        }

        const normalized = String(filename).replace(/\\/g, '/').toLowerCase()
        if (!/opengraph-image\.(jpg|jpeg|png|webp)$/.test(normalized) && !/icon\.ico$/.test(normalized)) {
          return
        }

        scheduleSync(`${eventType}:${normalized}`)
      },
    )

    watcher.on('error', (error) => {
      log(`watcher error: ${error.message}`)
    })

    log(`watching ${WATCH_ROOT}`)
    return watcher
  } catch (error) {
    log(`failed to watch assets: ${error.message}`)
    return null
  }
}

startWatcher()

