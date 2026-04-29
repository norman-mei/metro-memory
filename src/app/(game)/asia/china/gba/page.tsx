export { metadata } from './metadata'

import CityDataGamePage from '@/components/CityDataGamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import config from './config'

export default function GreaterBayArea() {
  return (
    <Provider value={config}>
      <Main className="font-cjk min-h-screen">
        <CityDataGamePage slug="gba" />
      </Main>
    </Provider>
  )
}
