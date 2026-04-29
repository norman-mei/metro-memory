#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const root = process.cwd()
const stateDir = path.join(root, '.dev-server')
const pidPath = path.join(stateDir, 'metro-memory-dev.pid')
const logPath = path.join(stateDir, 'metro-memory-dev.log')
const command = process.argv[2] || 'status'

const ensureStateDir = () => {
  fs.mkdirSync(stateDir, { recursive: true })
}

const readPid = () => {
  try {
    const raw = fs.readFileSync(pidPath, 'utf8').trim()
    const pid = Number(raw)
    return Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

const isRunning = (pid) => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const removePidFile = () => {
  try {
    fs.unlinkSync(pidPath)
  } catch {
    // ignore
  }
}

const start = () => {
  ensureStateDir()
  const existingPid = readPid()
  if (isRunning(existingPid)) {
    console.log(`dev server already running: pid ${existingPid}`)
    console.log(`logs: ${logPath}`)
    return
  }
  removePidFile()

  const logFd = fs.openSync(logPath, 'a')
  fs.writeSync(logFd, `\n\n[${new Date().toISOString()}] starting npm run dev\n`)

  const child = spawn('npm', ['run', 'dev'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  })

  fs.writeFileSync(pidPath, String(child.pid))
  child.unref()
  fs.closeSync(logFd)

  console.log(`dev server started: pid ${child.pid}`)
  console.log(`logs: ${logPath}`)
}

const stop = () => {
  const pid = readPid()
  if (!pid) {
    console.log('dev server is not running')
    return
  }
  if (!isRunning(pid)) {
    removePidFile()
    console.log('dev server pid file was stale')
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // ignore
    }
  }
  removePidFile()
  console.log(`dev server stopped: pid ${pid}`)
}

const status = () => {
  const pid = readPid()
  if (isRunning(pid)) {
    console.log(`dev server running: pid ${pid}`)
    console.log(`logs: ${logPath}`)
    return
  }
  if (pid) {
    removePidFile()
  }
  console.log('dev server is not running')
}

const logs = () => {
  ensureStateDir()
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '')
  }
  const tail = spawn('tail', ['-n', '80', '-f', logPath], {
    stdio: 'inherit',
  })
  tail.on('exit', (code) => process.exit(code ?? 0))
}

switch (command) {
  case 'start':
    start()
    break
  case 'stop':
    stop()
    break
  case 'status':
    status()
    break
  case 'logs':
    logs()
    break
  default:
    console.error('Usage: node scripts/dev-server.js <start|stop|status|logs>')
    process.exit(1)
}
