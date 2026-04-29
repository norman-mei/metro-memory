import test from 'node:test'
import assert from 'node:assert/strict'

import fs from 'fs'
import os from 'os'
import path from 'path'
import JSZip from 'jszip'

import { buildGtfsDiffCandidates } from '../../scripts/metro-sync/gtfsDiff.ts'

test('buildGtfsDiffCandidates derives direct line and station changes from GTFS', async () => {
  const zip = new JSZip()
  zip.file(
    'routes.txt',
    'route_id,route_short_name,route_long_name,route_color\nr1,1,Blue Line,1122aa\nr2,2,Airport Express,ff6600',
  )
  zip.file(
    'stops.txt',
    'stop_id,stop_name,stop_lat,stop_lon\ns1,Central,40.0,-74.0\ns2,Riverfront,40.0009,-74.0009\ns3,Airport,40.2,-74.2',
  )
  zip.file(
    'trips.txt',
    'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1\nr2,weekday,t2,shape2',
  )
  zip.file(
    'stop_times.txt',
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1\nt1,00:01:00,00:01:00,s2,2\nt2,00:00:00,00:00:00,s3,1',
  )
  zip.file(
    'shapes.txt',
    'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,40.0,-74.0,1\nshape1,40.0009,-74.0009,2\nshape2,40.2,-74.2,1',
  )

  const tempPath = path.join(os.tmpdir(), `metro-memory-test-gtfs-diff-${Date.now()}.zip`)
  fs.writeFileSync(tempPath, await zip.generateAsync({ type: 'nodebuffer' }))

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'sample-city',
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
      existingFeatures: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-74.0, 40.0],
          },
          properties: {
            name: 'Central',
            line: 'line1',
          },
        },
      ],
      existingLines: {
        line1: {
          name: 'Line 1',
          color: '#1122AA',
        },
      },
    })

    assert.ok(candidates.some((candidate) => candidate.type === 'LINE_RENAME_CANDIDATE'))
    assert.ok(candidates.some((candidate) => candidate.type === 'NEW_STATION'))
    assert.ok(candidates.some((candidate) => candidate.type === 'NEW_LINE'))
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('buildGtfsDiffCandidates detects station rename and closure heuristics', async () => {
  const zip = new JSZip()
  zip.file(
    'routes.txt',
    'route_id,route_short_name,route_long_name,route_color\nr1,1,Blue Line,1122aa',
  )
  zip.file(
    'stops.txt',
    'stop_id,stop_name,stop_lat,stop_lon\ns1,Grand Central,40.0,-74.0',
  )
  zip.file(
    'trips.txt',
    'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1',
  )
  zip.file(
    'stop_times.txt',
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1',
  )
  zip.file(
    'shapes.txt',
    'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,40.0,-74.0,1',
  )

  const tempPath = path.join(os.tmpdir(), `metro-memory-test-gtfs-diff-rename-${Date.now()}.zip`)
  fs.writeFileSync(tempPath, await zip.generateAsync({ type: 'nodebuffer' }))

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'sample-city',
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
      existingFeatures: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-74.0, 40.0],
          },
          properties: {
            name: 'Central Station',
            alternate_names: ['Central'],
            line: 'line1',
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-74.003, 40.003],
          },
          properties: {
            name: 'Old Town',
            line: 'line1',
          },
        },
      ],
      existingLines: {
        line1: {
          name: 'Blue Line',
          color: '#1122AA',
        },
      },
    })

    const renameCandidate = candidates.find(
      (candidate) =>
        candidate.type === 'UPDATED_STATION' &&
        candidate.diff &&
        typeof candidate.diff === 'object' &&
        candidate.diff.change === 'gtfs-stop-rename',
    )
    const removalCandidate = candidates.find(
      (candidate) =>
        candidate.type === 'REMOVED_STATION' &&
        candidate.diff &&
        typeof candidate.diff === 'object' &&
        candidate.diff.change === 'gtfs-stop-removed',
    )

    assert.ok(renameCandidate)
    assert.ok(removalCandidate)
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})
