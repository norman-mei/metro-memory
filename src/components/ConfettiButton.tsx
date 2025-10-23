'use client'

import { ReactNode, useCallback } from 'react'
import colors from 'tailwindcss/colors'

const ConfettiButton = ({ children }: { children: ReactNode }) => {
  const onClick = useCallback(() => {
    const makeConfetti = async () => {
      const confetti = (await import('tsparticles-confetti')).confetti
      confetti({
        spread: 120,
        ticks: 200,
        particleCount: 150,
        origin: { y: 0.2 },
        colors: [
          colors.yellow[500],
          colors.amber[500],
          colors.orange[500],
          colors.yellow[400],
          colors.amber[400],
          colors.orange[400],
        ],
        decay: 0.85,
        shapes: ['square'],
        gravity: 2,
        startVelocity: 50,
        scalar: 2,
      })
    }

    makeConfetti()
  }, [])

  return <button onClick={onClick}>{children}</button>
}

export default ConfettiButton
