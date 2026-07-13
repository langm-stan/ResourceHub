import { useCallback, useState } from 'react'

/**
 * useState that survives navigation: the value is mirrored to localStorage so
 * leaving a tool and coming back restores the visitor's parameters.
 *
 * A stored value is used only when it matches the default's type (and, for
 * numbers, is finite), so stale or corrupted entries fall back to the default.
 * Pass `isValid` to tighten that check for union-typed values.
 */
export function usePersistentState<T extends string | number | boolean>(
  key: string,
  initial: T,
  isValid?: (v: T) => boolean,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) {
        const parsed = JSON.parse(raw) as unknown
        if (
          typeof parsed === typeof initial &&
          (typeof parsed !== 'number' || Number.isFinite(parsed)) &&
          (!isValid || isValid(parsed as T))
        ) {
          return parsed as T
        }
      }
    } catch {
      /* private mode or a corrupted entry: use the default */
    }
    return initial
  })

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {
          /* storage unavailable: state still works for this visit */
        }
        return v
      })
    },
    [key],
  )

  return [value, set]
}
