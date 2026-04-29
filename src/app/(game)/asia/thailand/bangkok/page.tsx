import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'bangkok',
  cityPath: 'asia/thailand/bangkok',
  cityTitle: 'Bangkok (à¸à¸£à¸¸à¸‡à¹€à¸—à¸žà¸¯)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
