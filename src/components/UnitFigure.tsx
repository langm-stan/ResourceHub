import type { ReactElement, SVGProps } from 'react'
import styles from './UnitCatalog.module.css'

/*
 * One small figure per unit, for the catalog cards.
 *
 * These are the unit's central chart reduced to its shape, in the manner of
 * the tool marks (see ToolMark.tsx) but wide enough to read as
 * a figure: the same two tones, one quiet and one cardinal, on a shared
 * 240 by 72 frame. The cardinal line is the one that draws itself in when
 * the page opens.
 *
 * They carry nothing a screen reader needs, since the unit's name and
 * description sit beside them, so they are hidden from it.
 */

const quiet: SVGProps<SVGPathElement> = { stroke: 'var(--text-muted)', strokeOpacity: 0.4 }
/** The line that draws in. pathLength makes the dash arithmetic the same for every path. */
const accent: SVGProps<SVGPathElement> = {
  stroke: 'var(--accent)',
  strokeWidth: 2.5,
  pathLength: 1,
  className: styles.draw,
}
/** Bars are lines with a wide stroke, so they draw in the same way. */
const bar = { strokeWidth: 16, strokeLinecap: 'butt' as const }

const base = <path key="base" d="M8 64 H232" {...quiet} />

const FIGURES: Record<string, ReactElement[]> = {
  // A distribution of answers, the last bar the one being read.
  'basic-tools': [
    <path key="q" d="M30 64 V36 M64 64 V24 M98 64 V42 M132 64 V16 M166 64 V30" {...quiet} {...bar} />,
    <path key="a" d="M200 64 V8" {...accent} {...bar} />,
    base,
  ],
  // Simple interest against compound interest.
  basics: [
    <path key="q" d="M8 62 L232 40" {...quiet} />,
    <path key="a" d="M8 62 C100 60 180 44 232 8" {...accent} />,
    base,
  ],
  // What is owned over what is owed.
  budgeting: [
    <path key="q" d="M8 48 H124" {...quiet} {...bar} />,
    <path key="a" d="M8 22 H212" {...accent} {...bar} />,
  ],
  // Earnings rise and fall over a working life; spending is held level.
  'savings-decisions': [
    <path key="q" d="M8 40 H232" {...quiet} />,
    <path key="a" d="M8 60 C60 60 80 10 130 10 C175 10 190 44 232 56" {...accent} />,
  ],
  // The same balance paid off slowly and quickly.
  debt: [
    <path key="q" d="M8 10 C110 16 190 36 232 64" {...quiet} />,
    <path key="a" d="M8 10 C60 20 100 44 132 64" {...accent} />,
    base,
  ],
  // A dial, because that is how the score is read.
  fico: [
    <path key="q" d="M68 62 A52 52 0 0 1 172 62" {...quiet} />,
    <path key="a" d="M120 62 L154 22" {...accent} />,
    <circle key="c" cx="120" cy="62" r="3.5" fill="var(--accent)" stroke="none" />,
  ],
  // A new car loses value faster than a used one.
  car: [
    <path key="q" d="M8 8 C40 36 120 50 232 56" {...quiet} />,
    <path key="a" d="M8 34 C60 46 140 52 232 58" {...accent} />,
    base,
  ],
  // The owner's wealth and the renter's, thirty years on.
  home: [
    <path key="q" d="M8 60 C90 58 170 52 232 42" {...quiet} />,
    <path key="a" d="M8 60 C90 58 170 40 232 8" {...accent} />,
    base,
  ],
  // The cost comes first and the return comes after.
  education: [
    <path key="q" d="M8 36 H232" {...quiet} />,
    <path key="a" d="M8 36 C24 60 44 66 70 56 C120 36 180 20 232 8" {...accent} />,
  ],
  // One line that lurches and one that does not.
  markets: [
    <path key="q" d="M8 60 C90 58 170 50 232 40" {...quiet} />,
    <path
      key="a"
      d="M8 58 L32 46 L50 52 L76 34 L96 42 L124 24 L146 36 L176 18 L198 26 L232 8"
      {...accent}
    />,
    base,
  ],
  // The same idea with the swings turned up.
  'special-topics': [
    <path key="q" d="M8 56 L232 36" {...quiet} />,
    <path
      key="a"
      d="M8 50 L26 30 L40 56 L60 14 L78 48 L100 22 L118 60 L140 10 L160 44 L184 20 L206 52 L232 16"
      {...accent}
    />,
  ],
  // The brackets, as steps.
  taxes: [
    <path key="a" d="M8 58 H52 V47 H98 V36 H144 V24 H190 V10 H232" {...accent} />,
    base,
  ],
  // The worker's contribution, and the employer's on top of it.
  'employer-benefits': [
    <path key="q" d="M44 64 V50 M96 64 V42 M148 64 V34 M200 64 V26" {...quiet} {...bar} />,
    <path key="a" d="M44 50 V42 M96 42 V30 M148 34 V18 M200 26 V6" {...accent} {...bar} />,
    base,
  ],
  // A household hit by a loss, and one that paid a premium instead.
  insurance: [
    <path key="q" d="M8 18 H92 L106 60 L124 54 L232 44" {...quiet} />,
    <path key="a" d="M8 26 H232" {...accent} />,
  ],
  // Savings built up to retirement, then drawn down.
  retirement: [
    <path key="q" d="M150 6 V64" strokeDasharray="3 5" {...quiet} />,
    <path key="a" d="M8 62 C70 60 120 40 150 12 C180 20 210 44 232 60" {...accent} />,
    base,
  ],
}

export function UnitFigure({ id }: { id: string }) {
  const figure = FIGURES[id]
  if (!figure) return null
  return (
    <svg
      viewBox="0 0 240 72"
      className={styles.unitFigure}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {figure}
    </svg>
  )
}
