'use client'

import { useEffect } from 'react'
import maplibregl, { GeoJSONSource } from 'maplibre-gl'
import { bbox, bboxPolygon, buffer } from '@turf/turf'
import { BBox2d } from '@turf/helpers/lib/geojson'
import 'maplibre-gl/dist/maplibre-gl.css'

interface CityProperties {
  value: number
  normalizedValue: number
  name: string
  lines: string[]
  percentile: number
  formattedPercentile: string
  id: number
}

const StatsGraph = ({
  values,
  slug,
  routes,
}: {
  values: {
    lines: string[]
    value: number
    name: string
    geometry: GeoJSON.Point
    id: number
    percentile: number
  }[]
  slug: string
  routes: GeoJSON.FeatureCollection<GeoJSON.LineString, { color: string }>
}) => {
  useEffect(() => {
    const collection: GeoJSON.FeatureCollection<GeoJSON.Point, CityProperties> =
      {
        type: 'FeatureCollection',
        features: values
          .map(
            (value): GeoJSON.Feature<GeoJSON.Point, CityProperties> => ({
              type: 'Feature',
              properties: {
                value: value.value,
                normalizedValue: value.value / values[0].value,
                name: value.name,
                lines: value.lines,
                id: value.id,
                formattedPercentile: formatPercentile(value.percentile),
                percentile: value.percentile,
              },
              geometry: value.geometry,
              id: value.id,
            }),
          )
          .reverse(),
      }

    var map = new maplibregl.Map({
      container: `map-${slug}`, // container id
      bounds: bbox(
        buffer(bboxPolygon(bbox(collection)), 1, { units: 'kilometers' }),
      ) as BBox2d,
      style: {
        version: 8,
        sources: {
          points: {
            type: 'geojson',
            data: collection,
          },
          routes: {
            type: 'geojson',
            data: routes,
          },
          hovered: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },
        },
        glyphs:
          'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf?key=Xfb74aIJXmRrUdfJyYo5',
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#fff',
            },
          },
          {
            id: 'routes',
            type: 'line',
            source: 'routes',
            paint: {
              'line-color': ['get', 'color'],
              'line-opacity': 0.5,
              'line-width': 2,
            },
          },
          {
            id: 'points',
            type: 'circle',
            source: 'points',
            paint: {
              'circle-radius': [
                '+',
                ['*', ['-', 1, ['get', 'percentile']], 8],
                2,
              ],
              'circle-color': '#fff',
              //   [
              //   'interpolate',
              //   ['linear'],
              //   ['get', 'normalizedValue'],
              //   0,
              //   '#ffeda0',
              //   0.7,
              //   '#feb24c',
              //   1,
              //   '#f03b20',
              // ],
              'circle-opacity': 1,
              'circle-stroke-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#000',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'normalizedValue'],
                  0,
                  '#eee',
                  0.7,
                  '#777',
                  1,
                  '#000',
                ],
              ],
              'circle-stroke-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                3,
                2,
              ],
            },
          },
          {
            id: 'hovered-names',
            type: 'symbol',
            source: 'hovered',
            layout: {
              'text-field': [
                'format',
                ['get', 'name'],
                { 'font-scale': 1.2 },
                '\n',
                {},
                ['get', 'formattedPercentile'],
                { 'font-scale': 0.8 },
              ],
              'text-font': ['Open Sans Regular'],
              'text-size': 12,
              'text-offset': [0, -2.5],
            },
            paint: {
              'text-opacity': 1,
              'text-color': '#000',
              'text-halo-color': 'rgba(255,255,255,0.8)',
              'text-halo-width': 2,
            },
          },
        ],
      },
      center: [0, 0], // starting position [lng, lat]
      zoom: 1, // starting zoom
    })

    map.addControl(new maplibregl.FullscreenControl())
    map.addControl(new maplibregl.NavigationControl())

    map.on('mousemove', (e) => {
      // get the features around the mouse pointer
      const features = map.queryRenderedFeatures(
        [
          [e.point.x - 4, e.point.y - 4],
          [e.point.x + 4, e.point.y + 4],
        ],
        {
          layers: ['points'],
        },
      )

      const feature = features?.[0]

      if (feature) {
        map.getCanvas().style.cursor = 'pointer'
        map.removeFeatureState({ source: 'points' })
        map.setFeatureState(
          { source: 'points', id: feature.id },
          { hover: true },
        )
        ;(map.getSource('hovered') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [feature],
        })
      } else {
        map.getCanvas().style.cursor = ''
        map.removeFeatureState({ source: 'points' })
        ;(map.getSource('hovered') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        })
      }
    })

    return () => {
      map.remove()
    }
  }, [slug, values, routes])
  return <div id={`map-${slug}`} className="h-[80vh] w-full"></div>
}

const formatPercentile = (percentile: number) => {
  if (percentile === 1) {
    return 'Worst'
  }

  if (percentile === 0) {
    return 'Best'
  }

  if (percentile < 0.1) {
    return `Top ${Math.ceil(percentile * 100)}%`
  }

  if (percentile > 0.9) {
    return `Bottom ${Math.ceil((1 - percentile) * 100)}%`
  }

  if (percentile < 0.45) {
    return `Top ${5 * Math.ceil(percentile * 20)}%`
  }

  if (percentile > 0.55) {
    return `Bottom ${5 * Math.ceil((1 - percentile) * 20)}%`
  }

  return 'Average'
}

export default StatsGraph
