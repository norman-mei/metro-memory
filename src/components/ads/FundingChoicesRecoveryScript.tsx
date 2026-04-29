'use client'

import { useEffect } from 'react'

export default function FundingChoicesRecoveryScript({ src }: { src: string }) {
  useEffect(() => {
    if (!src || document.getElementById('funding-choices-recovery')) {
      return
    }

    const script = document.createElement('script')
    script.id = 'funding-choices-recovery'
    script.src = src
    script.async = true
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [src])

  return null
}
