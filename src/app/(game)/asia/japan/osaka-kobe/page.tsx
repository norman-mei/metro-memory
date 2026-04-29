import PlaceholderPage from '@/app/(game)/_placeholder/PlaceholderPage'
import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'

const config = buildPlaceholderConfig({
  citySlug: 'osaka-kobe',
  cityPath: 'asia/japan/osaka-kobe',
  cityTitle: 'Osaka\u2013Kobe (\u5927\u962a\u30fb\u795e\u6238)',
})


export const metadata = config.METADATA

export default function Page() {
  return <PlaceholderPage config={config} />
}
