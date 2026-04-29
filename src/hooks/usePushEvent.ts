import { useConfig } from '@/lib/configContext'

const pushEvent = (matches: string[]) => {
  if (matches.length === 0) return

  fetch('/api/count', {
    method: 'POST',
    body: JSON.stringify({
      matches,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

const usePushEvent = () => {
  const { CITY_NAME } = useConfig()
  return (matches: (string | number)[]) =>
    pushEvent(matches.map((match) => `${CITY_NAME}-${match}`))
}

export default usePushEvent
