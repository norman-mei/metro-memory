import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'zhangjiakou',
  cityPath: 'asia/china/zhangjiakou',
  cityTitle: 'Zhangjiakou (å¼ å®¶å£)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
