#!/usr/bin/env node

const path = require('path')
const fs = require('fs/promises')
const fg = require('fast-glob')
const sharp = require('sharp')

const SOURCE_ROOT = path.join(process.cwd(), 'public', 'images')
const DEST_ROOT = path.join(process.cwd(), 'public', 'city-cards')

async function ensureDestDir() {
  await fs.mkdir(DEST_ROOT, { recursive: true })
}

async function main() {
  await ensureDestDir()

  const matches = await fg('**/opengraph-image.{jpg,jpeg,png,webp}', {
    cwd: SOURCE_ROOT,
  })
  let copied = 0

  for (const relPath of matches) {
    const slug = path.basename(path.dirname(relPath))
    const src = path.join(SOURCE_ROOT, relPath)
    const dest = path.join(DEST_ROOT, `${slug}.jpg`)
    const rendered = await sharp(src).jpeg({ quality: 90 }).toBuffer()
    await fs.writeFile(dest, rendered)
    copied += 1
  }

  console.log(`Copied ${copied} city card images to ${DEST_ROOT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
