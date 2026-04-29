export { metadata } from './metadata'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import config from './config'
import { Provider } from '@/lib/configContext'
import Main from '@/components/Main'
import CityDataGamePage from '@/components/CityDataGamePage'

export default function Amtrak() {
  return (
    <Provider value={config}>
      <Main className="min-h-screen">
        <CityDataGamePage slug="amtrak" />
      </Main>
    </Provider>
  )
}
