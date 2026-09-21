import type { ReactNode } from 'react'
import styles from './Callout.module.css'

interface CalloutProps {
  /** `note` (accent), `mark` (cardinal — for "extreme"/caution), `plain`. */
  tone?: 'note' | 'mark' | 'plain'
  label?: string
  children: ReactNode
}

/*
 * A small bordered box: definitions, connections, takeaways.
 *
 * A <div>, not an <aside>. An aside is a complementary landmark, and a page
 * carrying two of them unlabelled leaves a screen reader announcing two
 * regions it cannot tell apart. Landmarks are for the regions of a page, not
 * for a box inside its prose.
 */
export function Callout({ tone = 'note', label, children }: CalloutProps) {
  return (
    <div className={`${styles.callout} ${styles[tone]}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.body}>{children}</div>
    </div>
  )
}
