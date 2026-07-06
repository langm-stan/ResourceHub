import type { ReactNode } from 'react'
import styles from './StepHeader.module.css'

interface StepHeaderProps {
  /** Step number shown in a friendly badge, e.g. 2. */
  step?: number
  title: ReactNode
  /** Plain-language helper line under the title. */
  hint?: ReactNode
}

/** A guided-workbook section heading: a numbered badge + plain title + hint. */
export function StepHeader({ step, title, hint }: StepHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.row}>
        {step != null && <span className={styles.badge}>{step}</span>}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </header>
  )
}
