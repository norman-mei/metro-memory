import data from './data/features.json'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import { DataFeatureCollection, RoutesFeatureCollection } from '@/lib/types'
import config from './config'
import GamePage from '@/components/GamePage'
import { Provider } from '@/lib/configContext'
import Main from '@/components/Main'
import { Inter } from 'next/font/google'
import routesData from './data/routes.json'

const font = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const fc = {
  ...data,
  features: data.features.filter((feature) =>
    feature?.properties?.line ? Boolean(config.LINES[feature.properties.line]) : false,
  ),
} as DataFeatureCollection

const routeFeatures = routesData.features
  .map((feature): RoutesFeatureCollection['features'][number] | null => {
    const line = feature.properties?.line
    if (!line || !config.LINES[line]) {
      return null
    }
    const defaultColor = config.LINES[line]?.color ?? '#1d2835'
    const color =
      typeof feature.properties?.color === 'string' && feature.properties.color.length > 0
        ? feature.properties.color
        : defaultColor

    return {
      ...feature,
      properties: {
        ...feature.properties,
        color,
      },
    }
  })
  .filter((feature): feature is RoutesFeatureCollection['features'][number] => feature !== null)

const routes: RoutesFeatureCollection = {
  type: routesData.type,
  features: routeFeatures,
}

export const metadata = config.METADATA

export default function Macau() {
  return (
    <Provider value={config}>
      <Main className={`${font.className} min-h-screen`}>
        <GamePage fc={fc} routes={routes} />
      </Main>
    </Provider>
  )
}
