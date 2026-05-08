import { generateMiniCityMetadata, renderMiniCityPage } from '@/lib/miniCityPage'

export async function generateMetadata() {
  return generateMiniCityMetadata('nyc-path')
}

export default async function NYCPathPage() {
  return renderMiniCityPage('nyc-path')
}
