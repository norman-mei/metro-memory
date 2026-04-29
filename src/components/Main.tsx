'use client'

import React, { useCallback, useEffect, useState } from 'react'

export default function Main({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [el, setEl] = useState<HTMLElement | null>(null)

  const ref = useCallback((node: HTMLElement | null) => {
    setEl(node)
  }, [])

  useEffect(() => {
    if (!el) return

    const removeStyle = () => {
      if (el.getAttribute('style')) {
        el.removeAttribute('style')
      }
    }

    removeStyle()

    const observer = new MutationObserver(removeStyle)
    observer.observe(el, { attributes: true, attributeFilter: ['style'] })

    return () => observer.disconnect()
  }, [el])

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  )
}
