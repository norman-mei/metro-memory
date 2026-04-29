'use client'

import { useSettings } from '@/context/SettingsContext'
import { i18n, resolveI18nLocaleCode } from '@/lib/i18n'

const useTranslation = () => {
  const { settings } = useSettings()
  i18n.locale(resolveI18nLocaleCode(settings.language))

  return i18n
}

export default useTranslation
