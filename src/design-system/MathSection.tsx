import type { ReactNode } from 'react'
import { FormulaBlock } from './FormulaBlock'
import { StepHeader } from './StepHeader'
import styles from './MathSection.module.css'

export interface MathRow {
  tex: string
  caption?: string
  muted?: boolean
}

/**
 * The house presentation for a worked-math report: one heading, a stack of
 * FormulaBlocks with the reader's inputs substituted in, and a closing note
 * separated by a hairline. Every tool page shows its backend math this way,
 * whether the section lives in a "The math" tab or at the bottom of the page.
 *
 * Convention per calculation: a symbolic formula with a caption naming its
 * terms, then the substituted form (muted), then the evaluated result in a
 * \boxed{} (muted).
 */
export function MathSection({
  title = 'See the math',
  hint,
  rows,
  note,
  children,
}: {
  title?: ReactNode
  hint?: ReactNode
  rows: MathRow[]
  /** Closing takeaway under the formulas, separated by a hairline. */
  note?: ReactNode
  /** Extra content after the note, e.g. a Callout. */
  children?: ReactNode
}) {
  return (
    <section className={styles.section}>
      <StepHeader title={title} hint={hint} />
      <div className={styles.rows}>
        {rows.map((row, idx) => (
          <FormulaBlock key={idx} tex={row.tex} caption={row.caption} muted={row.muted} />
        ))}
      </div>
      {note != null && <p className={styles.note}>{note}</p>}
      {children}
    </section>
  )
}
