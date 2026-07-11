import { buildPlaceholderConfig } from '@/app/(game)/_placeholder/config'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'

import BeijingPreviewGate from './BeijingPreviewGate'

const placeholderConfig = buildPlaceholderConfig({
  citySlug: 'beijing',
  cityPath: 'asia/china/beijing',
  cityTitle: 'Beijing (北京)',
  description: 'Beijing Metro Memory is coming soon while the station data is being prepared.',
  mapBounds: [
    [115.4, 39.35],
    [117.65, 41.05],
  ],
  mapMaxBounds: [
    [114.8, 39.0],
    [118.1, 41.5],
  ],
})

export const metadata = placeholderConfig.METADATA

export default function Page() {
  return <BeijingPreviewGate />
}
