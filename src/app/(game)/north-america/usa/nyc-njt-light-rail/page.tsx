import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'

export async function generateMetadata() {
  return generateMiniCityMetadata('nyc-njt-light-rail')
}

export default async function NYCNjtLightRailPage() {
  return renderMiniCityPage('nyc-njt-light-rail')
}
