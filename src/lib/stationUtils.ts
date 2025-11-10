import { DataFeature } from '@/lib/types'

export const getStationKey = (feature: DataFeature) => {
  const propertiesWithCluster = feature.properties as typeof feature.properties & {
    cluster_key?: number | string
  }

  if (
    propertiesWithCluster?.cluster_key !== undefined &&
    propertiesWithCluster?.cluster_key !== null
  ) {
    return `cluster|${propertiesWithCluster.cluster_key}`
  }

  const name = (feature.properties.name ?? '').trim().toLowerCase()

  if (feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
    const [lng, lat] = feature.geometry.coordinates as number[]
    const formattedLng = typeof lng === 'number' ? lng.toFixed(6) : String(lng)
    const formattedLat = typeof lat === 'number' ? lat.toFixed(6) : String(lat)
    return `${name}|${formattedLng}|${formattedLat}`
  }

  return `${name}|${feature.id ?? ''}`
}

export default getStationKey
