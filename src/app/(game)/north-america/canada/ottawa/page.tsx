export { metadata } from './metadata'
// Force reload
import CityDataGamePage from '@/components/CityDataGamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import config from './config'

export default function Ottawa() {
  return (
    <Provider value={config}>
      <Main className="min-h-screen">
        <CityDataGamePage slug="ottawa" />
      </Main>
    </Provider>
  )
}
