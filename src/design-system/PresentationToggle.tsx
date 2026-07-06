import { useEffect, useState } from 'react'
import styles from './PresentationToggle.module.css'

type Level = 0 | 1 | 2

const LABELS: Record<Level, string> = { 0: '100%', 1: '125%', 2: '150%' }

function currentLevel(): Level {
  if (typeof document === 'undefined') return 0
  const p = document.documentElement.dataset.present
  return p === '1' ? 1 : p === '2' ? 2 : 0
}

/**
 * Cycles the whole interface through presentation sizes (100% → 125% → 150%)
 * for projecting in a classroom. Remembers the choice.
 */
export function PresentationToggle() {
  const [level, setLevel] = useState<Level>(currentLevel)

  useEffect(() => {
    if (level === 0) delete document.documentElement.dataset.present
    else document.documentElement.dataset.present = String(level)
    try {
      localStorage.setItem('ifdm-present', String(level))
    } catch {
      // ignore storage failures
    }
  }, [level])

  const next = ((level + 1) % 3) as Level
  return (
    <button
      type="button"
      className={level === 0 ? styles.toggle : `${styles.toggle} ${styles.active}`}
      onClick={() => setLevel(next)}
      aria-label={`Presentation size ${LABELS[level]}. Click to set ${LABELS[next]}.`}
      title={`Presentation size: ${LABELS[level]}. Click to enlarge.`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <path
          d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.label}>{LABELS[level]}</span>
    </button>
  )
}
