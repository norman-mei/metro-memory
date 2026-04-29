import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'huaian',
  cityPath: 'asia/china/huaian',
  cityTitle: 'Huai\'an (æ·®å®‰)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
