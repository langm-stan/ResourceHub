import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useResizeObserver } from '../hooks/useResizeObserver'
import { ENTRIES, OpenUnit, type Entry } from './UnitCatalog'
import { UnitFigure } from './UnitFigure'
import styles from './TopicCatalog.module.css'

/*
 * PROTOTYPES of the front page as a few larger cards, each with a list
 * inside. Neither changes the units themselves: the sidebar, the tool pages
 * and the unit numbers still follow COURSE_UNITS.
 *
 * /?layout=topics  Five topic cards, each naming its three units, so all
 *                  fifteen units are on the page. Pressing a unit shows its
 *                  tools under the row, whether it has one tool or six.
 *
 * /?layout=eight-cards
 *                  The same eight parts as small cards, four across, each
 *                  opening onto its tools: the layout that was live for a
 *                  day. Drawn by UnitCatalog from EIGHT_ENTRIES below.
 *
 * /?layout=eight   Eight parts (the combined units tried in October 2026),
 *                  each card listing its tools. A tool's name goes straight to the
 *                  tool, so nothing has to open.
 */

interface Topic {
  title: string
  /** Unit ids from COURSE_UNITS, in teaching order. */
  units: string[]
  /** The unit whose figure stands for the topic. */
  figure: string
}

/** The eight parts, numbered on their cards, each listing its tools. */
const EIGHT: Topic[] = [
  { title: 'Tools and Data', units: ['basic-tools'], figure: 'basic-tools' },
  { title: 'Basics of Personal Finance', units: ['basics', 'budgeting'], figure: 'basics' },
  {
    title: 'Saving, Debt and Credit',
    units: ['savings-decisions', 'debt', 'fico'],
    figure: 'savings-decisions',
  },
  {
    title: 'Major Purchases: Car, House and Education',
    units: ['car', 'home', 'education'],
    figure: 'home',
  },
  { title: 'Investing: Bonds, Stocks and Mutual Funds', units: ['markets'], figure: 'markets' },
  {
    title: 'Sports Betting and Gambling',
    units: ['special-topics'],
    figure: 'special-topics',
  },
  { title: 'Taxes and Employer Benefits', units: ['taxes', 'employer-benefits'], figure: 'taxes' },
  { title: 'Insurance and Retirement', units: ['insurance', 'retirement'], figure: 'retirement' },
]

const TOPICS: Topic[] = [
  { title: 'Foundations', units: ['basic-tools', 'basics', 'budgeting'], figure: 'basics' },
  {
    title: 'Saving and borrowing',
    units: ['savings-decisions', 'debt', 'fico'],
    figure: 'savings-decisions',
  },
  { title: 'Major purchases', units: ['car', 'home', 'education'], figure: 'education' },
  { title: 'Investing and taxes', units: ['markets', 'special-topics', 'taxes'], figure: 'markets' },
  {
    title: 'Benefits, insurance and retirement',
    units: ['employer-benefits', 'insurance', 'retirement'],
    figure: 'retirement',
  },
]

const entriesOf = (topic: Topic) =>
  topic.units
    .map((id) => ENTRIES.find((e) => e.unit.id === id))
    .filter((e): e is Entry => e !== undefined)

function UnitRow({
  entry,
  open,
  onToggle,
}: {
  entry: Entry
  open: boolean
  onToggle: () => void
}) {
  const { unit, number } = entry
  return (
    <button
      type="button"
      className={styles.unit}
      id={`unit-card-${unit.id}`}
      aria-expanded={open}
      aria-controls={open ? 'unit-open' : undefined}
      onClick={onToggle}
    >
      <span className={styles.unitNo}>{number}</span>
      <span className={styles.unitName}>{unit.title}</span>
      <ChevronDown size={16} aria-hidden="true" className={styles.unitIcon} />
    </button>
  )
}

/** One tool as a line in a card: its name, which goes straight to the tool. */
function ToolRow({ slug, label }: { slug: string; label: string }) {
  return (
    <Link to={`/${slug}`} className={styles.unit}>
      <span className={styles.unitName}>{label}</span>
      <ArrowRight size={16} aria-hidden="true" className={styles.unitIcon} />
    </Link>
  )
}

/*
 * The eight parts as entries for the unit cards (/?layout=eight-cards): the
 * layout that was live for a day in October 2026, each card opening onto its
 * tools.
 */
export const EIGHT_ENTRIES: Entry[] = EIGHT.map((part, i) => ({
  number: i + 1,
  kind: 'Part',
  unit: {
    id: `part-${i + 1}`,
    title: part.title,
    short: part.title,
    description: '',
    tools: entriesOf(part).flatMap((e) => e.unit.tools),
    figure: part.figure,
    topics: [],
  },
}))

export function TopicCatalog({ layout = 'topics' }: { layout?: 'topics' | 'eight' }) {
  const eight = layout === 'eight'
  const groups = eight ? EIGHT : TOPICS
  const [openId, setOpenId] = useState<string | null>(null)
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()
  // Topics: five across where there is room, then three over two, then one.
  // The eight: four across, which still fits the 880px iframe, then two, then one.
  const perRow = eight
    ? width === 0 || width >= 800
      ? 4
      : width >= 480
        ? 2
        : 1
    : width === 0 || width >= 1000
      ? 5
      : width >= 600
        ? 3
        : 1
  const rows: Topic[][] = []
  for (let i = 0; i < groups.length; i += perRow) rows.push(groups.slice(i, i + perRow))

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
        const open = eight ? undefined : row.flatMap(entriesOf).find((e) => e.unit.id === openId)
        return (
          <div key={r} className={styles.row} style={{ '--per-row': perRow } as CSSProperties}>
            <div className={styles.cards}>
              {row.map((topic) => {
                const n = groups.indexOf(topic)
                return (
                  <section key={topic.title} className={styles.card} aria-labelledby={`topic-${n}`}>
                    {/* "Unit" is the course's word for the fifteen, so these are parts. */}
                    {eight && <span className={styles.cardNo}>Part {n + 1}</span>}
                    <UnitFigure id={topic.figure} />
                    <h2 id={`topic-${n}`} className={styles.title}>
                      {topic.title}
                    </h2>
                    <div className={styles.units}>
                      {eight
                        ? entriesOf(topic)
                            .flatMap((entry) => entry.unit.tools)
                            .map((tool) => <ToolRow key={tool.slug} slug={tool.slug} label={tool.label} />)
                        : entriesOf(topic).map((entry) => (
                            <UnitRow
                              key={entry.unit.id}
                              entry={entry}
                              open={entry === open}
                              onToggle={() => setOpenId(entry === open ? null : entry.unit.id)}
                            />
                          ))}
                    </div>
                  </section>
                )
              })}
            </div>
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
