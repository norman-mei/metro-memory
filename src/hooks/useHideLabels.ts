import mapboxgl from 'mapbox-gl'
import { useEffect, useState } from 'react'

const useHideLabels = (map: mapboxgl.Map | null) => {
  const [hideLabels, setHideLabels] = useState<boolean>(false)

  useEffect(() => {
    if (!map) {
      return
    }

    try {
      if (!map.getStyle()?.layers || !map.getLayer('stations-labels')) {
        return
      }

      map.setLayoutProperty(
        'stations-labels',
        'visibility',
        hideLabels ? 'none' : 'visible',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.toLowerCase().includes('style')) {
        console.warn('Failed to update stations-labels visibility', error)
      }
    }
  }, [hideLabels, map])

  return { hideLabels, setHideLabels }
}

export default useHideLabels
