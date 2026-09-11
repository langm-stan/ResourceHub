import { useEffect, useState } from 'react'
import styles from './PresentationToggle.module.css'

/*
 * Text size for the page. Scaling everything inside <main> together enlarges
 * the type without the reflow that changing font sizes alone would cause, and
 * keeps charts and controls in proportion with it. Larger settings are for
 * projecting in a classroom or for anyone who wants bigger text; smaller ones
 * fit more on screen, which matters inside the narrow content well on
 * ifdm.stanford.edu. The Stanford header and footer are left alone.
 */

/** Percentages the tool can be shown at, smallest first. */
const SIZES = [75, 90, 100, 125, 150] as const
const DEFAULT_INDEX = SIZES.indexOf(100)
const KEY = 'ifdm-present'

function apply(size: number) {
  if (size === 100) delete document.documentElement.dataset.present
  else document.documentElement.dataset.present = String(size)
}

function stored(): number {
  if (typeof document === 'undefined') return DEFAULT_INDEX
  try {
    const raw = Number(localStorage.getItem(KEY))
    const i = SIZES.indexOf(raw as (typeof SIZES)[number])
    if (i >= 0) return i
  } catch {
    // Storage blocked: fall back to the normal size.
  }
  return DEFAULT_INDEX
}

export function PresentationToggle() {
  const [index, setIndex] = useState(stored)
  const size = SIZES[index]!

  useEffect(() => {
    apply(size)
    try {
      localStorage.setItem(KEY, String(size))
    } catch {
      // ignore storage failures
    }
  }, [size])

  const step = (delta: number) =>
    setIndex((i) => Math.min(SIZES.length - 1, Math.max(0, i + delta)))

  return (
    <div className={styles.group} role="group" aria-label="Text size">
      <button
        type="button"
        className={styles.step}
        onClick={() => step(-1)}
        disabled={index === 0}
        aria-label="Smaller text"
        title="Smaller"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        className={styles.readout}
        onClick={() => setIndex(DEFAULT_INDEX)}
        disabled={size === 100}
        aria-label={`Text size ${size} percent. Select to return to 100 percent.`}
        title={size === 100 ? 'Normal size' : 'Back to 100%'}
      >
        {size}%
      </button>
      <button
        type="button"
        className={styles.step}
        onClick={() => step(1)}
        disabled={index === SIZES.length - 1}
        aria-label="Larger text"
        title="Larger"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
