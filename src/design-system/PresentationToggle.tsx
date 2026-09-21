import { useSyncExternalStore } from 'react'
import { getTextSize, setTextSize, SIZES, subscribeTextSize } from './textSize'
import styles from './PresentationToggle.module.css'

/*
 * A minus, the current percentage, a plus. The readout doubles as the way
 * back to 100%, so the control needs no separate reset.
 *
 * The size itself lives in textSize, not here: this control unmounts and
 * remounts whenever the screen fills, and the size has to outlast that.
 */

export function PresentationToggle({ tone = 'light' }: { tone?: 'light' | 'dark' } = {}) {
  const size = useSyncExternalStore(subscribeTextSize, getTextSize, getTextSize)
  const index = SIZES.indexOf(size)

  const step = (delta: number) => {
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, index + delta))]
    if (next) setTextSize(next)
  }

  return (
    <div
      className={`${styles.group} ${tone === 'dark' ? styles.dark : ''}`}
      role="group"
      aria-label="Text size"
    >
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
        onClick={() => setTextSize(100)}
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
