import { useConfig } from '@/lib/configContext'
import { normalizeString } from '@/lib/normalizeStationString'
import { useMemo } from 'react'

export { normalizeString } from '@/lib/normalizeStationString'

const useNormalizeString = () => {
  const { CITY_NAME } = useConfig()
  return useMemo(() => normalizeString(CITY_NAME), [CITY_NAME])
}

export default useNormalizeString
