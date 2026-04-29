'use client'

import { useEffect } from 'react'

export default function AdSenseScript({ src }: { src: string }) {
  useEffect(() => {
    if (!src || document.getElementById('adsense-script')) {
      return
    }

    const script = document.createElement('script')
    script.id = 'adsense-script'
    script.src = src
    script.async = true
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [src])

  return null
}
