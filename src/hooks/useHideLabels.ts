import mapboxgl from 'mapbox-gl'
import { useEffect, useState } from 'react'

const useHideLabels = (map: mapboxgl.Map | null) => {
  const [hideLabels, setHideLabels] = useState<boolean>(false)

  useEffect(() => {
    if (map && hideLabels) {
      map.setLayoutProperty('stations-labels', 'visibility', 'none')
    } else if (map) {
      map.setLayoutProperty('stations-labels', 'visibility', 'visible')
    }
  }, [hideLabels, map])

  return { hideLabels, setHideLabels }
}

export default useHideLabels
