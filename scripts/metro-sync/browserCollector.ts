import fs from 'fs'
import path from 'path'
import { createHash } from 'node:crypto'

import * as cheerio from 'cheerio'
import { applyAutomationTimeoutCeiling } from '../../src/lib/automationRuntime.ts'

import type { CollectedArtifactType } from './types'

const ROOT = process.cwd()
const BROWSER_CACHE_DIR = path.join(ROOT, 'tmp', 'metro-sync', 'browser')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function buildBrowserCacheBase(city: string, url: string) {
  const hash = createHash('sha1').update(`${city}|${url}`).digest('hex')
  return path.join(BROWSER_CACHE_DIR, city, hash)
}

export async function collectBrowserRenderedArtifact(input: {
  city: string
  url: string
  artifactType: CollectedArtifactType
}) {
  if (String(process.env.METRO_SYNC_ENABLE_BROWSER_COLLECTOR || '').trim() !== '1') {
    return null
  }

  let playwright: any = null
  try {
    playwright = await import('playwright')
  } catch {
    return null
  }

  const browser = await playwright.chromium.launch({
    headless: true,
  })

  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent: 'MetroMemoryAutomationBrowser/1.0',
    })
    const page = await context.newPage()
    await page.goto(input.url, {
      waitUntil: 'networkidle',
      timeout: applyAutomationTimeoutCeiling(
        Number(process.env.METRO_SYNC_BROWSER_TIMEOUT_MS || 30000),
        30000,
      ),
    })

    const html = await page.content()
    const title = await page.title()
    const headline = await page.locator('h1').first().textContent().catch(() => null)
    const linkedPressUrls = await page
      .locator('a[href]')
      .evaluateAll((elements) =>
        elements
          .map((element) => String((element as HTMLAnchorElement).href || '').trim())
          .filter((href) => /press|news|alert|service-update|update/i.test(href))
          .slice(0, 5),
      )
      .catch(() => [])

    const basePath = buildBrowserCacheBase(input.city, input.url)
    ensureDir(path.dirname(basePath))
    const htmlPath = `${basePath}.html`
    const screenshotPath = `${basePath}.png`
    fs.writeFileSync(htmlPath, html)
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    })

    const $ = cheerio.load(html)
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)

    return {
      artifact: {
        citySlug: input.city,
        artifactType: input.artifactType,
        sourceUrl: input.url,
        sourceDomain: new URL(input.url).hostname.replace(/^www\./, ''),
        mimeType: 'text/html',
        localPath: path.relative(ROOT, htmlPath).replace(/\\/g, '/'),
        contentHash: createHash('sha256').update(html).digest('hex'),
        fetchedAt: new Date().toISOString(),
        metadataJson: {
          title: title || null,
          headline: headline || null,
          linkedPressUrls,
          renderedByBrowser: true,
          bodyTextExcerpt: bodyText,
          screenshotPath: path.relative(ROOT, screenshotPath).replace(/\\/g, '/'),
        },
      },
      linkedPressUrls,
    }
  } finally {
    await browser.close().catch(() => {})
  }
}
