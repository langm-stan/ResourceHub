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
  // The value currently on screen, so a retarget mid-animation continues from
  // wherever the count sits instead of jumping to the superseded target.
  const valueRef = useRef(target)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduced) {
      valueRef.current = target
      setValue(target)
      return
    }

    const from = valueRef.current
    const delta = target - from
    if (delta === 0) return

    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      const next = from + delta * easeOut(progress)
      valueRef.current = next
      setValue(next)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, reduced])

  return value
}
