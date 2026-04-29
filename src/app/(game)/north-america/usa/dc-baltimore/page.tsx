import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'
import { Metadata } from 'next'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'

export async function generateMetadata(): Promise<Metadata> {
  return generateMiniCityMetadata('dc-baltimore')
}

export default async function Page() {
  return renderMiniCityPage('dc-baltimore')
}
