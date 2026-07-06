import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Honors reduced-motion by jumping straight to the target.
 */
export function useCountUp(target: number, duration = 320): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduced) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    const delta = target - from
    if (delta === 0) return

    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      setValue(from + delta * easeOut(progress))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      fromRef.current = target
    }
  }, [target, duration, reduced])

  return value
}
