'use client'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const getApiBaseUrl = () =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? '')

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(getApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  })
