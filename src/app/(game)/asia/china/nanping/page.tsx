import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'nanping',
  cityPath: 'asia/china/nanping',
  cityTitle: 'Nanping (å—å¹³)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
