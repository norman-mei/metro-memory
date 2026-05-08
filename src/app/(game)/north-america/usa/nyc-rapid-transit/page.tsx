import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'

export async function generateMetadata() {
  return generateMiniCityMetadata('nyc-rapid-transit')
}

export default async function NYCRapidTransitPage() {
  return renderMiniCityPage('nyc-rapid-transit')
}
