const readPublicEnv = (value: string | undefined) => value?.trim() || ''

export const appConfig = {
  mapbox: {
    token: readPublicEnv(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
    styleLight: readPublicEnv(process.env.NEXT_PUBLIC_MAPBOX_STYLE),
    styleDark: readPublicEnv(process.env.NEXT_PUBLIC_MAPBOX_STYLE_DARK),
  },
  amap: {
    key: readPublicEnv(process.env.NEXT_PUBLIC_AMAP_KEY),
    securityJsCode: readPublicEnv(process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE),
    version: '2.0' as const,
  },
} as const

export const hasMapboxPublicConfig = () => Boolean(appConfig.mapbox.token)

export const hasAmapPublicConfig = () =>
  Boolean(appConfig.amap.key && appConfig.amap.securityJsCode)

export const getAmapPublicConfig = () => ({
  ...appConfig.amap,
  configured: hasAmapPublicConfig(),
})

export const getAmapSecurityBootstrapScript = () => {
  if (!appConfig.amap.securityJsCode) {
    return ''
  }

  return `window._AMapSecurityConfig = { securityJsCode: ${JSON.stringify(appConfig.amap.securityJsCode)} };`
}

export const getAmapLoaderConfig = () => ({
  key: appConfig.amap.key,
  version: appConfig.amap.version,
})
