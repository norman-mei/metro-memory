import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'chongqing',
  cityPath: 'asia/china/chongqing',
  cityTitle: 'Chongqing (é‡åº†)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
