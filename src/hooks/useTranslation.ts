'use client'

import { useConfig } from '@/lib/configContext'
import { i18n } from '@/lib/i18n'

// Keep this set in sync with any new Canadian city slugs so they default to English.
const CANADIAN_CITY_SLUGS = new Set(['montreal', 'vancouver'])

const useTranslation = () => {
  const { LOCALE, CITY_NAME } = useConfig()
  const effectiveLocale = CANADIAN_CITY_SLUGS.has(CITY_NAME) ? 'en' : LOCALE
  i18n.locale(effectiveLocale)

  return i18n
}

export default useTranslation
