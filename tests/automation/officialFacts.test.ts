import test from 'node:test'
import assert from 'node:assert/strict'

import fs from 'fs'
import os from 'os'
import path from 'path'
import JSZip from 'jszip'

import { extractOfficialArtifactFacts } from '../../scripts/metro-sync/officialFacts.ts'

function createSimplePdf(text: string) {
  const escapedText = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${`BT /F1 18 Tf 36 120 Td (${escapedText}) Tj ET`.length} >>\nstream\nBT /F1 18 Tf 36 120 Td (${escapedText}) Tj ET\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8')
}

test('extractOfficialArtifactFacts derives line and opening references from official artifact metadata', async () => {
  const facts = await extractOfficialArtifactFacts({
    city: 'sample-city',
    lineNames: ['Line 1'],
    artifacts: [
      {
        citySlug: 'sample-city',
        artifactType: 'PRESS_RELEASE',
        sourceUrl: 'https://metro.example.com/news/line1-opening',
        sourceDomain: 'metro.example.com',
        mimeType: 'text/html',
        metadataJson: {
          title: 'Line 1 extension opened today',
          headline: 'Metro Sample opens Line 1 extension',
        },
      },
    ],
  })

  assert.ok(facts.some((fact) => fact.kind === 'LINE_REFERENCE' && fact.lineName === 'Line 1'))
  assert.ok(facts.some((fact) => fact.kind === 'OPENING_REFERENCE'))
  assert.ok(facts.some((fact) => fact.kind === 'EXTENSION_REFERENCE'))
})

test('extractOfficialArtifactFacts reads GTFS route color and operator facts', async () => {
  const zip = new JSZip()
  zip.file('agency.txt', 'agency_id,agency_name,agency_url\nmm,Metro Memory Transit,https://example.com')
  zip.file(
    'routes.txt',
    'route_id,agency_id,route_short_name,route_long_name,route_color\nr1,mm,1,Line 1,1122aa',
  )

  const tempPath = path.join(os.tmpdir(), `metro-memory-test-gtfs-${Date.now()}.zip`)
  fs.writeFileSync(tempPath, await zip.generateAsync({ type: 'nodebuffer' }))

  try {
    const facts = await extractOfficialArtifactFacts({
      city: 'sample-city',
      lineNames: ['Line 1'],
      artifacts: [
        {
          citySlug: 'sample-city',
          artifactType: 'GTFS_FEED',
          sourceUrl: 'https://example.com/gtfs.zip',
          sourceDomain: 'example.com',
          mimeType: 'application/zip',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
    })

    assert.ok(facts.some((fact) => fact.kind === 'DATASET_REFERENCE'))
    assert.ok(
      facts.some(
        (fact) =>
          fact.kind === 'OPERATOR_METADATA_REFERENCE' &&
          fact.metadata?.operatorName === 'Metro Memory Transit',
      ),
    )
    assert.ok(
      facts.some(
        (fact) =>
          fact.kind === 'LINE_COLOR_REFERENCE' &&
          fact.lineName === 'Line 1' &&
          fact.metadata?.color === '#1122AA',
      ),
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('extractOfficialArtifactFacts reads text from PDF map artifacts', async () => {
  const tempPath = path.join(os.tmpdir(), `metro-memory-test-pdf-${Date.now()}.pdf`)
  fs.writeFileSync(tempPath, createSimplePdf('Line 1 extension opened today'))

  try {
    const facts = await extractOfficialArtifactFacts({
      city: 'sample-city',
      lineNames: ['Line 1'],
      artifacts: [
        {
          citySlug: 'sample-city',
          artifactType: 'MAP_PDF',
          sourceUrl: 'https://metro.example.com/maps/line1.pdf',
          sourceDomain: 'metro.example.com',
          mimeType: 'application/pdf',
          localPath: path.relative(process.cwd(), tempPath),
          metadataJson: {
            title: 'System map',
          },
        },
      ],
    })

    assert.ok(facts.some((fact) => fact.kind === 'LINE_REFERENCE' && fact.lineName === 'Line 1'))
    assert.ok(facts.some((fact) => fact.kind === 'OPENING_REFERENCE'))
    assert.ok(facts.some((fact) => fact.kind === 'MAP_REFERENCE'))
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('extractOfficialArtifactFacts parses structured html tables and legends', async () => {
  const tempPath = path.join(os.tmpdir(), `metro-memory-test-html-${Date.now()}.html`)
  fs.writeFileSync(
    tempPath,
    `
      <html>
        <body>
          <table>
            <tr><th>Line</th><th>Color</th><th>Stations</th></tr>
            <tr><td>Line 1</td><td>#1122AA</td><td>Central, Riverfront</td></tr>
          </table>
        </body>
      </html>
    `,
  )

  try {
    const facts = await extractOfficialArtifactFacts({
      city: 'sample-city',
      lineNames: ['Line 1'],
      artifacts: [
        {
          citySlug: 'sample-city',
          artifactType: 'OFFICIAL_PAGE',
          sourceUrl: 'https://metro.example.com/network',
          sourceDomain: 'metro.example.com',
          mimeType: 'text/html',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
    })

    assert.ok(facts.some((fact) => fact.kind === 'LINE_REFERENCE' && fact.lineName === 'Line 1'))
    assert.ok(
      facts.some(
        (fact) =>
          fact.kind === 'LINE_COLOR_REFERENCE' &&
          fact.lineName === 'Line 1' &&
          fact.metadata?.color === '#1122AA',
      ),
    )
    assert.ok(
      facts.some(
        (fact) =>
          fact.kind === 'STATION_REFERENCE' &&
          fact.metadata?.stopName === 'Central',
      ),
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('extractOfficialArtifactFacts surfaces a clear OCR traineddata error for local langPath', async () => {
  const tempPdfPath = path.join(os.tmpdir(), `metro-memory-test-ocr-${Date.now()}.pdf`)
  const emptyLangDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-memory-tessdata-'))
  const previousEnableOcr = process.env.METRO_SYNC_ENABLE_PDF_OCR
  const previousLang = process.env.METRO_SYNC_OCR_LANG
  const previousLangPath = process.env.METRO_SYNC_OCR_LANG_PATH

  fs.writeFileSync(tempPdfPath, createSimplePdf('Map'))
  process.env.METRO_SYNC_ENABLE_PDF_OCR = '1'
  process.env.METRO_SYNC_OCR_LANG = 'eng'
  process.env.METRO_SYNC_OCR_LANG_PATH = emptyLangDir

  try {
    await assert.rejects(
      extractOfficialArtifactFacts({
        city: 'sample-city',
        lineNames: ['Line 1'],
        artifacts: [
          {
            citySlug: 'sample-city',
            artifactType: 'MAP_PDF',
            sourceUrl: 'https://metro.example.com/maps/ocr.pdf',
            sourceDomain: 'metro.example.com',
            mimeType: 'application/pdf',
            localPath: path.relative(process.cwd(), tempPdfPath),
            metadataJson: {
              title: 'Map',
            },
          },
        ],
      }),
      /METRO_SYNC_OCR_LANG_PATH.*eng\.traineddata\.gz/,
    )
  } finally {
    if (previousEnableOcr === undefined) {
      delete process.env.METRO_SYNC_ENABLE_PDF_OCR
    } else {
      process.env.METRO_SYNC_ENABLE_PDF_OCR = previousEnableOcr
    }

    if (previousLang === undefined) {
      delete process.env.METRO_SYNC_OCR_LANG
    } else {
      process.env.METRO_SYNC_OCR_LANG = previousLang
    }

    if (previousLangPath === undefined) {
      delete process.env.METRO_SYNC_OCR_LANG_PATH
    } else {
      process.env.METRO_SYNC_OCR_LANG_PATH = previousLangPath
    }

    fs.rmSync(tempPdfPath, { force: true })
    fs.rmSync(emptyLangDir, { recursive: true, force: true })
  }
})
