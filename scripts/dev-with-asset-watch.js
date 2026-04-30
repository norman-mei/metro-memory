#!/usr/bin/env node

const path = require('node:path')
const { spawn } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const nextBin = require.resolve('next/dist/bin/next')
const nextArgs = process.argv.slice(2)

const watcher = spawn(process.execPath, [path.join(__dirname, 'watch-city-assets.js')], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
})

const runtimeDataWatcher = spawn(
  process.execPath,
  [path.join(__dirname, 'watch-city-runtime-data.js')],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  },
)

const next = spawn(process.execPath, [nextBin, 'dev', ...nextArgs], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
})

let shuttingDown = false

function stopChildren(exitCode = 0) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  if (!watcher.killed) {
    watcher.kill('SIGTERM')
  }
  if (!runtimeDataWatcher.killed) {
    runtimeDataWatcher.kill('SIGTERM')
  }
  if (!next.killed) {
    next.kill('SIGTERM')
  }

  process.exit(exitCode)
}

process.on('SIGINT', () => stopChildren(130))
process.on('SIGTERM', () => stopChildren(143))

watcher.on('exit', (code) => {
  if (shuttingDown) {
    return
  }
  console.warn(`[dev-with-asset-watch] asset watcher exited with code ${code ?? 0}`)
})

runtimeDataWatcher.on('exit', (code) => {
  if (shuttingDown) {
    return
  }
  console.warn(
    `[dev-with-asset-watch] runtime-data watcher exited with code ${code ?? 0}`,
  )
})

next.on('exit', (code) => {
  stopChildren(code ?? 0)
})

