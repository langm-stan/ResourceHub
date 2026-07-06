import type { ReactNode } from 'react'
import styles from './Callout.module.css'

interface CalloutProps {
  /** `note` (accent), `mark` (cardinal — for "extreme"/caution), `plain`. */
  tone?: 'note' | 'mark' | 'plain'
  label?: string
  children: ReactNode
}

/** A small bordered aside — definitions, connections, takeaways. */
export function Callout({ tone = 'note', label, children }: CalloutProps) {
  return (
    <aside className={`${styles.callout} ${styles[tone]}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.body}>{children}</div>
    </aside>
  )
}
