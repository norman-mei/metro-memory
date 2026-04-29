export { metadata } from './metadata'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import 'mapbox-gl/dist/mapbox-gl.css'
import Link from 'next/link'
import 'react-circular-progressbar/dist/styles.css'
import config from './config'
import NYGameClient from './NYGameClient'

export default function NY() {
  return (
    <Provider value={config}>
      <Main className="min-h-screen">
        <NYGameClient />
      </Main>
    </Provider>
  )
}
