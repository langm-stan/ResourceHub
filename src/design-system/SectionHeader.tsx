import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  kicker?: string
  number?: string
  title: ReactNode
  lead?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
}

/** A section heading with an optional kicker + number. */
export function SectionHeader({
  kicker,
  number,
  title,
  lead,
  as = 'h2',
}: SectionHeaderProps) {
  const Heading = as
  return (
    <header className={styles.root}>
      {(kicker || number) && (
        <div className={styles.eyebrow}>
          {number && <span className={styles.section}>§&nbsp;{number}</span>}
          {kicker && <span className={styles.kicker}>{kicker}</span>}
        </div>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {lead && <p className={styles.lead}>{lead}</p>}
    </header>
  )
}
