import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'hangzhou',
  cityPath: 'asia/china/hangzhou',
  cityTitle: 'Hangzhou-Shaoxing- (æ­å·ž-ç»å…´)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
