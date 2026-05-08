import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'

export async function generateMetadata() {
  return generateMiniCityMetadata('nyc-mta-commuter-rail')
}

export default async function NYCMtaCommuterRailPage() {
  return renderMiniCityPage('nyc-mta-commuter-rail')
}
