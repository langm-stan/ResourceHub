import { useMemo } from 'react'
import katex from 'katex'
import styles from './FormulaBlock.module.css'

interface FormulaBlockProps {
  tex: string
  inline?: boolean
  caption?: string
  muted?: boolean
}

/** Typeset math via KaTeX (synchronous, no network). */
export function FormulaBlock({ tex, inline, caption, muted }: FormulaBlockProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: !inline,
        throwOnError: false,
        output: 'html',
      }),
    [tex, inline],
  )

  if (inline) {
    return <span className={styles.inline} dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <figure className={muted ? `${styles.block} ${styles.muted}` : styles.block}>
      <div className={styles.math} dangerouslySetInnerHTML={{ __html: html }} />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  )
}
