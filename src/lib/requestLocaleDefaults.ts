export type RequestLocaleDefaults = {
  countryCode: string | null
  inMainlandChina: boolean
  defaultLanguage: 'en' | 'zh-CN'
}

const COUNTRY_HEADER_KEYS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-country-code',
  'x-appengine-country',
  'cloudfront-viewer-country',
  'fastly-country-code',
] as const

export function readRequestCountryCode(
  headerStore: Pick<Headers, 'get'>,
): string | null {
  for (const key of COUNTRY_HEADER_KEYS) {
    const value = headerStore.get(key)?.trim().toUpperCase()
    if (value && value !== 'XX' && value !== 'T1') {
      return value
    }
  }

  return null
}

export function isMainlandChinaCountryCode(
  countryCode?: string | null,
): boolean {
  return countryCode?.trim().toUpperCase() === 'CN'
}

export function getRequestLocaleDefaults(
  headerStore: Pick<Headers, 'get'>,
): RequestLocaleDefaults {
  const countryCode = readRequestCountryCode(headerStore)
  const inMainlandChina = isMainlandChinaCountryCode(countryCode)

  return {
    countryCode,
    inMainlandChina,
    defaultLanguage: inMainlandChina ? 'zh-CN' : 'en',
  }
}
