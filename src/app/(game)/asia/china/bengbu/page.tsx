import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'bengbu',
  cityPath: 'asia/china/bengbu',
  cityTitle: 'Bengbu (èšŒåŸ )',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
