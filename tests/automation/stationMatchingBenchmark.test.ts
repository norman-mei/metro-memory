import test from 'node:test'
import assert from 'node:assert/strict'

import fs from 'fs'
import os from 'os'
import path from 'path'
import JSZip from 'jszip'

import { buildGtfsDiffCandidates } from '../../scripts/metro-sync/gtfsDiff.ts'

async function writeGtfsZip(name: string, spec: {
  routes: string
  stops: string
  trips: string
  stopTimes: string
  shapes?: string
}) {
  const zip = new JSZip()
  zip.file('routes.txt', spec.routes)
  zip.file('stops.txt', spec.stops)
  zip.file('trips.txt', spec.trips)
  zip.file('stop_times.txt', spec.stopTimes)
  if (spec.shapes) {
    zip.file('shapes.txt', spec.shapes)
  }

  const tempPath = path.join(os.tmpdir(), `metro-memory-${name}-${Date.now()}.zip`)
  fs.writeFileSync(tempPath, await zip.generateAsync({ type: 'nodebuffer' }))
  return tempPath
}

test('station matching benchmark: london-style rename stays matched to the same station', async () => {
  const tempPath = await writeGtfsZip('london-benchmark', {
    routes: 'route_id,route_short_name,route_long_name,route_color\nr1,C,Central Line,DC241F',
    stops: 'stop_id,stop_name,stop_lat,stop_lon\ns1,Bank,51.5133,-0.0886\ns2,Oxford Circus Underground Station,51.5152,-0.1419',
    trips: 'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1',
    stopTimes:
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1\nt1,00:01:00,00:01:00,s2,2',
    shapes: 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,51.5133,-0.0886,1\nshape1,51.5152,-0.1419,2',
  })

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'london',
      artifacts: [
        {
          citySlug: 'london',
          artifactType: 'GTFS_FEED',
          sourceUrl: 'https://example.com/london.zip',
          sourceDomain: 'example.com',
          mimeType: 'application/zip',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
      existingFeatures: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-0.0886, 51.5133] },
          properties: { name: 'Bank', line: 'central' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-0.1419, 51.5152] },
          properties: { name: 'Oxford Circus', line: 'central' },
        },
      ],
      existingLines: {
        central: { name: 'Central Line', color: '#DC241F' },
      },
    })

    assert.ok(
      candidates.some(
        (candidate) =>
          candidate.type === 'UPDATED_STATION' &&
          candidate.diff &&
          typeof candidate.diff === 'object' &&
          candidate.diff.change === 'gtfs-stop-rename',
      ),
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('station matching benchmark: new york-style station suffix does not create a fake new station', async () => {
  const tempPath = await writeGtfsZip('ny-benchmark', {
    routes: 'route_id,route_short_name,route_long_name,route_color\nr1,1,Line 1,EE352E',
    stops: 'stop_id,stop_name,stop_lat,stop_lon\ns1,South Ferry Subway Station,40.7017,-74.0132',
    trips: 'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1',
    stopTimes: 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1',
    shapes: 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,40.7017,-74.0132,1',
  })

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'ny',
      artifacts: [
        {
          citySlug: 'ny',
          artifactType: 'GTFS_FEED',
          sourceUrl: 'https://example.com/ny.zip',
          sourceDomain: 'example.com',
          mimeType: 'application/zip',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
      existingFeatures: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-74.0132, 40.7017] },
          properties: { name: 'South Ferry', line: '1' },
        },
      ],
      existingLines: {
        '1': { name: '1', color: '#EE352E' },
      },
    })

    assert.equal(
      candidates.some((candidate) => candidate.type === 'NEW_STATION'),
      false,
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('station matching benchmark: paris-style accented station names stay grouped as one station update set', async () => {
  const tempPath = await writeGtfsZip('paris-benchmark', {
    routes: 'route_id,route_short_name,route_long_name,route_color\nr1,1,Métro 1,FFCD00',
    stops: 'stop_id,stop_name,stop_lat,stop_lon\ns1,Charles de Gaulle - Étoile,48.8738,2.2950',
    trips: 'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1',
    stopTimes: 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1',
    shapes: 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,48.8738,2.2950,1',
  })

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'paris',
      artifacts: [
        {
          citySlug: 'paris',
          artifactType: 'GTFS_FEED',
          sourceUrl: 'https://example.com/paris.zip',
          sourceDomain: 'example.com',
          mimeType: 'application/zip',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
      existingFeatures: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.2950, 48.8738] },
          properties: { name: 'Charles de Gaulle Etoile', line: 'METRO 1' },
        },
      ],
      existingLines: {
        'METRO 1': { name: 'METRO 1', color: '#FFCD00' },
      },
      stationAliases: {
        'Charles de Gaulle - Étoile': 'Charles de Gaulle Etoile',
      },
    })

    assert.equal(
      candidates.some((candidate) => candidate.type === 'NEW_STATION'),
      false,
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})

test('station matching benchmark: seoul local names do not create duplicate station additions', async () => {
  const tempPath = await writeGtfsZip('seoul-benchmark', {
    routes: 'route_id,route_short_name,route_long_name,route_color\nr1,2,2호선,00A84D',
    stops: 'stop_id,stop_name,stop_lat,stop_lon\ns1,서울역,37.5547,126.9706',
    trips: 'route_id,service_id,trip_id,shape_id\nr1,weekday,t1,shape1',
    stopTimes: 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,00:00:00,00:00:00,s1,1',
    shapes: 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nshape1,37.5547,126.9706,1',
  })

  try {
    const candidates = await buildGtfsDiffCandidates({
      city: 'seoul',
      artifacts: [
        {
          citySlug: 'seoul',
          artifactType: 'GTFS_FEED',
          sourceUrl: 'https://example.com/seoul.zip',
          sourceDomain: 'example.com',
          mimeType: 'application/zip',
          localPath: path.relative(process.cwd(), tempPath),
        },
      ],
      existingFeatures: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [126.9706, 37.5547] },
          properties: { name: 'Seoul Station', line: 'SeoulSubway2Hoseon' },
        },
      ],
      existingLines: {
        SeoulSubway2Hoseon: { name: '2호선', color: '#00A84D' },
      },
      stationAliases: {
        '서울역': 'Seoul Station',
      },
      stationLocalNames: {
        'Seoul Station': ['서울역'],
      },
    })

    assert.equal(
      candidates.some((candidate) => candidate.type === 'NEW_STATION'),
      false,
    )
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
})
