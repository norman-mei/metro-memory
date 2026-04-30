import type { FeatureCollection, Geometry, GeometryCollection, Position } from 'geojson'

const PI = Math.PI
const AXIS = 6378245.0
const EE = 0.00669342162296594323
const geometryTransformCache = new WeakMap<Geometry, Geometry>()
const positionTransformCache = new Map<string, Position>()
const featureCollectionTransformCache = new Map<
  string,
  FeatureCollection<Geometry, Record<string, unknown>>
>()

const isCoordinatePair = (value: unknown): value is Position =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  Number.isFinite(value[0]) &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[1])

export const isInChinaForGcj02 = (lng: number, lat: number) =>
  lng >= 72.004 &&
  lng <= 137.8347 &&
  lat >= 0.8293 &&
  lat <= 55.8271

const transformLat = (lng: number, lat: number) => {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret +=
    ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) /
    3.0
  return ret
}

const transformLng = (lng: number, lat: number) => {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret +=
    ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) /
    3.0
  return ret
}

export const convertWgs84ToGcj02 = ([lng, lat, altitude]: Position): Position => {
  if (!isInChinaForGcj02(lng, lat)) {
    return altitude === undefined ? [lng, lat] : [lng, lat, altitude]
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((AXIS * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((AXIS / sqrtMagic) * Math.cos(radLat) * PI)
  const convertedLng = lng + dLng
  const convertedLat = lat + dLat

  return altitude === undefined
    ? [convertedLng, convertedLat]
    : [convertedLng, convertedLat, altitude]
}

const getPositionCacheKey = ([lng, lat, altitude]: Position) =>
  altitude === undefined ? `${lng},${lat}` : `${lng},${lat},${altitude}`

export const convertWgs84ToGcj02Cached = (position: Position): Position => {
  const cacheKey = getPositionCacheKey(position)
  const cached = positionTransformCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const transformed = convertWgs84ToGcj02(position)
  positionTransformCache.set(cacheKey, transformed)
  return transformed
}

export const convertLngLatTupleForAmap = (
  coordinate: readonly [number, number],
): [number, number] => {
  const transformed = convertWgs84ToGcj02Cached([coordinate[0], coordinate[1]])
  return [transformed[0], transformed[1]]
}

const transformCoordinatesDeep = (coordinates: unknown): unknown => {
  if (isCoordinatePair(coordinates)) {
    return convertWgs84ToGcj02Cached(coordinates)
  }
  if (!Array.isArray(coordinates)) {
    return coordinates
  }
  return coordinates.map((value) => transformCoordinatesDeep(value))
}

export const transformGeometryForAmap = <T extends Geometry>(geometry: T): T => {
  const cached = geometryTransformCache.get(geometry)
  if (cached) {
    return cached as T
  }

  let transformed: T
  if (geometry.type === 'GeometryCollection') {
    const geometryCollection = geometry as GeometryCollection
    transformed = {
      ...geometryCollection,
      geometries: geometryCollection.geometries.map((item) => transformGeometryForAmap(item)),
    } as T
  } else {
    transformed = {
      ...geometry,
      coordinates: transformCoordinatesDeep((geometry as Exclude<Geometry, GeometryCollection>).coordinates),
    } as T
  }

  geometryTransformCache.set(geometry, transformed)
  return transformed
}

export const transformFeatureCollectionForAmap = <
  T extends FeatureCollection<Geometry, Record<string, unknown>>,
>(
  collection: T,
): T => ({
  ...collection,
  features: collection.features.map((feature) => ({
    ...feature,
    geometry: transformGeometryForAmap(feature.geometry),
  })),
})

export const transformFeatureCollectionForAmapCached = <
  T extends FeatureCollection<Geometry, Record<string, unknown>>,
>(
  cacheKey: string,
  collection: T,
): T => {
  const cached = featureCollectionTransformCache.get(cacheKey)
  if (cached) {
    return cached as T
  }

  const transformed = transformFeatureCollectionForAmap(collection)
  featureCollectionTransformCache.set(cacheKey, transformed)
  return transformed
}
