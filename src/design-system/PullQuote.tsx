import type { ReactNode } from 'react'
import styles from './PullQuote.module.css'

interface PullQuoteProps {
  children: ReactNode
  cite?: string
}

/** A hung pull quote with a cardinal hairline. */
export function PullQuote({ children, cite }: PullQuoteProps) {
  return (
    <blockquote className={styles.quote}>
      <p className={styles.text}>{children}</p>
      {cite && <cite className={styles.cite}>{cite}</cite>}
    </blockquote>
  )
}
