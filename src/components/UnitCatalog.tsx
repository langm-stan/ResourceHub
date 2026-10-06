import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import '@fontsource/source-serif-4/600.css'
import { COURSE_UNITS, type CourseUnit } from '../data/teacherTraining'
import { useResizeObserver } from '../hooks/useResizeObserver'
import { ToolMark } from './ToolMark'
import { UnitFigure } from './UnitFigure'
import styles from './UnitCatalog.module.css'

/*
 * The front page's units as cards: each carries its number, its name, a
 * small figure and how many tools are behind it, and nothing else. Pressing
 * a card shows its tools under that row, centred. One unit is open at a
 * time, and pressing it again closes it.
 *
 * The same component serves the full site, the IFDM iframe and a filled
 * screen. It lays out from the width it is given: five cards across where
 * there is room, which includes the 880px iframe, then three, then one.
 */

interface Entry {
  unit: CourseUnit
  /** Position in the course, from one. */
  number: number
}

const ENTRIES: Entry[] = COURSE_UNITS.map((unit, i) => ({ unit, number: i + 1 }))

function UnitCard({
  entry,
  open,
  onToggle,
  order,
}: {
  entry: Entry
  open: boolean
  onToggle: () => void
  /** Position in the row, for staggering the figures as they draw. */
  order: number
}) {
  const { unit, number } = entry
  const { tools } = unit

  return (
    <div
      className={`${styles.card} ${styles.in}`}
      data-open={open}
      style={{ '--stagger': `${order * 90}ms` } as CSSProperties}
    >
      <span className={styles.unitNo}>Unit {number}</span>
      <h2 className={styles.cardTitle}>
        {/* The button is the title; its ::after covers the card, so the
            whole card is the target while the name stays the label. */}
        <button
          type="button"
          onClick={onToggle}
          id={`unit-card-${unit.id}`}
          aria-expanded={open}
          // The panel exists only while a unit is open.
          aria-controls={open ? 'unit-open' : undefined}
        >
          {unit.title}
        </button>
      </h2>
      <span className={styles.cardFoot}>
        <UnitFigure id={unit.figure} />
        <span className={styles.count}>
          {tools.length === 1 ? '1 tool' : `${tools.length} tools`}
          <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
        </span>
      </span>
    </div>
  )
}

/** The open unit's tools, under its row. */
function OpenUnit({
  entry,
  perRow,
  onClose,
}: {
  entry: Entry
  /** How many cards the row above holds, which caps the tools per row. */
  perRow: number
  onClose: () => void
}) {
  const { unit, number } = entry
  const { tools } = unit
  const heading = useRef<HTMLHeadingElement>(null)
  // The tools can sit below other cards, a long way in tab order from the
  // one that was pressed, so focus goes to the unit's name here, which also
  // announces what has opened.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.closest('section')?.scrollIntoView({ block: 'nearest' })
  }, [])

  // Up to four tools sit in one row; five or six break into rows of three,
  // so the block stays centred and even either way.
  const toolsPerRow = perRow === 1 ? 1 : Math.min(tools.length <= 4 ? tools.length : 3, perRow)

  return (
    <section id="unit-open" className={styles.stage} aria-labelledby={`unit-open-${unit.id}`}>
      <header className={styles.stageHead}>
        <h2 ref={heading} id={`unit-open-${unit.id}`} tabIndex={-1} className={styles.stageTitle}>
          <span className={styles.unitNo}>Unit {number}</span> {unit.title}
        </h2>
        <button type="button" onClick={onClose} className={styles.close}>
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </header>
      <ul className={styles.tools} style={{ '--per-row': toolsPerRow } as CSSProperties}>
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link to={`/${tool.slug}`} className={styles.tool}>
              <span className={styles.toolMark}>
                <ToolMark slug={tool.slug} />
              </span>
              <span className={styles.toolName}>{tool.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function UnitCatalog() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()
  // Before the first measurement the width reads zero; assume the wide case.
  // Fifteen units: five across and three down where there is room, which
  // includes the 880px iframe, then three across and five down, then one.
  const perRow = width === 0 || width >= 760 ? 5 : width >= 460 ? 3 : 1
  const rows: Entry[][] = []
  for (let i = 0; i < ENTRIES.length; i += perRow) rows.push(ENTRIES.slice(i, i + perRow))

  // Closing puts focus back on the unit that was open.
  const lastOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openId === null && lastOpen.current)
      document.getElementById(`unit-card-${lastOpen.current}`)?.focus({ preventScroll: true })
    lastOpen.current = openId
  }, [openId])

  return (
    <div ref={ref} className={styles.catalog}>
      {rows.map((row, r) => {
        const open = row.find((e) => e.unit.id === openId)
        return (
          <div key={r} className={styles.cards} style={{ '--per-row': perRow } as CSSProperties}>
            {row.map((entry, i) => (
              <UnitCard
                key={entry.unit.id}
                entry={entry}
                open={entry === open}
                onToggle={() => setOpenId(entry === open ? null : entry.unit.id)}
                order={i}
              />
            ))}
            {open && (
              <OpenUnit
                key={open.unit.id}
                entry={open}
                perRow={perRow}
                onClose={() => setOpenId(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
