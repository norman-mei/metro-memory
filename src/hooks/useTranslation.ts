'use client'

import { useConfig } from '@/lib/configContext'
import { i18n } from '@/lib/i18n'

const useTranslation = () => {
  const { LOCALE } = useConfig()
  i18n.locale(LOCALE)

  return i18n
}

export default useTranslation
