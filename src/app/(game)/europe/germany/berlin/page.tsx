export { metadata } from './metadata'
import CityDataGamePage from '@/components/CityDataGamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import 'mapbox-gl/dist/mapbox-gl.css'
import localFont from 'next/font/local'
import 'react-circular-progressbar/dist/styles.css'
import config from './config'

const font = localFont({
  src: [
    {
      path: './fonts/sans.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/sans-bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
})

export default function Berlin() {
  return (
    <Provider value={config}>
      <Main className={`${font.className} min-h-screen`}>
        <CityDataGamePage slug="berlin" />
      </Main>
    </Provider>
  )
}
