import data from './data/features.json'
import routesData from './data/routes.json'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import { DataFeatureCollection, RoutesFeatureCollection } from '@/lib/types'
import config from './config'
import GamePage from '@/components/GamePage'
import { Provider } from '@/lib/configContext'
import Main from '@/components/Main'
import { Noto_Sans_TC, Noto_Sans_SC } from 'next/font/google'

const tcFont = Noto_Sans_TC({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const scFont = Noto_Sans_SC({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const fc = {
  ...data,
  features: data.features.filter((f) => !!config.LINES[f.properties.line || '']),
} as DataFeatureCollection

const routes = {
  ...routesData,
  features: routesData.features.filter((feature) => {
    const line = feature.properties?.line
    return line ? Boolean(config.LINES[line]) : false
  }),
} as RoutesFeatureCollection

export const metadata = config.METADATA

export default function HongKong() {
  return (
    <Provider value={config}>
      <Main className={`${tcFont.className} ${scFont.className} min-h-screen`}>
        <GamePage fc={fc} routes={routes} />
      </Main>
    </Provider>
  )
}
