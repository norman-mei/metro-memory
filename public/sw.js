const CACHE_NAME = 'metro-memory-v4'
const CITY_CACHE_PREFIX = 'metro-memory-city-'
const OFFLINE_MANIFEST_URL = '/offline-manifest.json'
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  OFFLINE_MANIFEST_URL,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(CORE_ASSETS)

      try {
        const res = await fetch(OFFLINE_MANIFEST_URL, { cache: 'no-store' })
        if (res.ok) {
          const manifest = await res.json()
          const assets = Array.isArray(manifest?.assets)
            ? manifest.assets
            : Array.isArray(manifest)
              ? manifest
              : []
          if (assets.length > 0) {
            await cache.addAll(assets)
          }
        }
      } catch (error) {
        console.warn('SW: skipping offline manifest', error)
      }

      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

async function cacheFirst(request) {
  const cityCacheKeys = (await caches.keys()).filter((key) =>
    key.startsWith(CITY_CACHE_PREFIX),
  )
  for (const key of cityCacheKeys) {
    const cityMatch = await caches.open(key).then((cache) => cache.match(request))
    if (cityMatch) return cityMatch
  }

  const cache = await caches.open(CACHE_NAME)
  const match = await cache.match(request)
  if (match) return match

  const response = await fetch(request)
  if (response && response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cityCacheKeys = (await caches.keys()).filter((key) =>
      key.startsWith(CITY_CACHE_PREFIX),
    )
    for (const key of cityCacheKeys) {
      const cityMatch = await caches.open(key).then((cityCache) => cityCache.match(request))
      if (cityMatch) return cityMatch
    }
    const match = await cache.match(request)
    if (match) return match
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (url.pathname.startsWith('/city-data')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (
    url.pathname.startsWith('/city-icons') ||
    url.pathname.startsWith('/city-cards') ||
    url.pathname.startsWith('/images')
  ) {
    event.respondWith(networkFirst(request))
    return
  }

  if (request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      networkFirst(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const fallback = await cache.match('/')
        return fallback || Response.error()
      }),
    )
    return
  }
})

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}
  const port = event.ports?.[0]
  const reply = (message) => {
    if (port) {
      port.postMessage(message)
    }
  }

  if (type === 'CACHE_CITY') {
    event.waitUntil(
      (async () => {
        try {
          const citySlug = payload?.citySlug
          const assets = Array.isArray(payload?.assets) ? payload.assets : []
          if (!citySlug || assets.length === 0) {
            throw new Error('Missing city assets')
          }
          const cache = await caches.open(`${CITY_CACHE_PREFIX}${citySlug}`)
          const results = await Promise.allSettled(
            assets.map((asset) => cache.add(new Request(asset, { cache: 'reload' }))),
          )
          const failed = results.filter((result) => result.status === 'rejected').length
          reply({ ok: true, cached: assets.length - failed, failed })
        } catch (error) {
          reply({ ok: false, error: error?.message || 'Unable to cache city' })
        }
      })(),
    )
    return
  }

  if (type === 'DELETE_CITY') {
    event.waitUntil(
      (async () => {
        try {
          const citySlug = payload?.citySlug
          if (!citySlug) {
            throw new Error('Missing city')
          }
          await caches.delete(`${CITY_CACHE_PREFIX}${citySlug}`)
          reply({ ok: true })
        } catch (error) {
          reply({ ok: false, error: error?.message || 'Unable to delete city' })
        }
      })(),
    )
  }
})
