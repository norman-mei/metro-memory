import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'

export async function generateMetadata() {
  return generateMiniCityMetadata('nyc-njt-commuter-rail')
}

export default async function NYCNjtCommuterRailPage() {
  return renderMiniCityPage('nyc-njt-commuter-rail')
}
