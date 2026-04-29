import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'

export async function generateMetadata() {
  return generateMiniCityMetadata('florida-state-jacksonville')
}

export default async function Page() {
  return renderMiniCityPage('florida-state-jacksonville')
}
