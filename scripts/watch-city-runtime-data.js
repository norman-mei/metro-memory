#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const GAME_ROOT = path.join(ROOT, 'src', 'app', '(game)')
const MINI_CITY_REGISTRY_PATH = path.join(
  ROOT,
  'src',
  'lib',
  'miniCitiesRegistry.json',
)
const DEBOUNCE_MS = 250

let debounceTimer = null
let syncRunning = false
let syncQueued = false

function log(message) {
  console.log(`[watch-city-runtime-data] ${message}`)
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
  log('regenerating runtime city-data...')

  const exportCode = await runCommand(process.execPath, [
    path.join(__dirname, 'export-city-data.js'),
  ])

  if (exportCode === 0) {
    log('runtime city-data export complete')
  } else {
    log(`runtime city-data export finished with code ${exportCode}`)
  }

  syncRunning = false
  if (syncQueued) {
    syncQueued = false
    void runSync()
  }
}

function scheduleSync(reason) {
  log(`change detected (${reason}), scheduling export`)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runSync()
  }, DEBOUNCE_MS)
}

function isRuntimeDataSource(filename) {
  const normalized = String(filename).replace(/\\/g, '/').toLowerCase()
  return /\/data(?:\/full)?\/(?:features|routes)\.json$/.test(normalized)
}

function startRecursiveWatcher() {
  if (!fs.existsSync(GAME_ROOT)) {
    log(`watch root missing: ${GAME_ROOT}`)
    return null
  }

  try {
    const watcher = fs.watch(
      GAME_ROOT,
      { persistent: true, recursive: true },
      (eventType, filename) => {
        if (!filename) {
          scheduleSync(eventType)
          return
        }

        if (!isRuntimeDataSource(filename)) {
          return
        }

        scheduleSync(`${eventType}:${String(filename).replace(/\\/g, '/')}`)
      },
    )

    watcher.on('error', (error) => {
      log(`recursive watcher error: ${error.message}`)
    })

    log(`watching ${GAME_ROOT}`)
    return watcher
  } catch (error) {
    log(`failed to watch runtime data: ${error.message}`)
    return null
  }
}

function startRegistryWatcher() {
  if (!fs.existsSync(MINI_CITY_REGISTRY_PATH)) {
    log(`mini-city registry missing: ${MINI_CITY_REGISTRY_PATH}`)
    return null
  }

  try {
    const watcher = fs.watch(
      MINI_CITY_REGISTRY_PATH,
      { persistent: true },
      (eventType) => {
        scheduleSync(`${eventType}:src/lib/miniCitiesRegistry.json`)
      },
    )

    watcher.on('error', (error) => {
      log(`registry watcher error: ${error.message}`)
    })

    log(`watching ${MINI_CITY_REGISTRY_PATH}`)
    return watcher
  } catch (error) {
    log(`failed to watch mini-city registry: ${error.message}`)
    return null
  }
}

void runSync()
startRecursiveWatcher()
startRegistryWatcher()
