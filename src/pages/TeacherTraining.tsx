import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Search } from 'lucide-react'
import { COURSE_UNITS, type TrainingTool } from '../data/teacherTraining'
import ResourceHubNav from '../components/ResourceHubNav'
import { useFullscreen } from '../components/FullscreenProvider'
import { StageControls } from '../components/StageControls'
import { ToolMark } from '../components/ToolMark'
import { useFramed } from '../hooks/useFramed'

/*
 * The Personal Finance Teaching Toolkit landing page: the fifteen units in
 * teaching order as one vertical list, each showing what is in it. Nothing is
 * folded away, because fifteen closed rows tell a first-time reader nothing
 * about the thirty tools behind them. Searching from the hero replaces the
 * list with the matching tools.
 */

interface SearchHit {
  tool: TrainingTool
  badge: string
}

/*
 * Search: the query is split into words, each word matches by substring or
 * by small-typo fuzziness against the tool's label, its keywords, its unit's
 * name, or its description (in falling order of weight). Tools matching
 * every word rank first; if none do, tools matching any word are shown.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9$%]+/g, ' ')
    .trim()

/** Whether a and b are within one edit (two for long words) of each other. */
function typoMatch(a: string, b: string): boolean {
  const max = a.length >= 8 ? 2 : 1
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, row[j]!)
    }
    if (best > max) return false
    prev = row
  }
  return prev[b.length]! <= max
}

interface SearchField {
  text: string
  words: string[]
  weight: number
}

interface SearchEntry {
  tool: TrainingTool
  badge: string
  fields: SearchField[]
}

function searchEntry(tool: TrainingTool, badge: string, unitText: string): SearchEntry {
  const field = (raw: string, weight: number): SearchField => {
    const text = normalize(raw)
    return { text, words: text.split(' ').filter(Boolean), weight }
  }
  return {
    tool,
    badge,
    fields: [
      field(tool.label, 3),
      field((tool.keywords ?? []).join(' '), 2.5),
      field(unitText, 1.5),
      field(tool.description, 1),
    ],
  }
}

const SEARCH_INDEX: SearchEntry[] = [
  ...COURSE_UNITS.flatMap((u, i) =>
    u.tools.map((t) => searchEntry(t, `Unit ${i + 1} · ${u.short}`, `unit ${i + 1} ${u.title} ${u.short}`)),
  ),
]

function runSearch(query: string): SearchHit[] {
  const tokens = normalize(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return []
  const scored = SEARCH_INDEX.map((entry) => {
    let score = 0
    let matched = 0
    for (const token of tokens) {
      let best = 0
      for (const f of entry.fields) {
        // One- and two-character tokens ("5", "iy") match only whole words,
        // so "unit 5" doesn't hit every "500" in a description.
        if (token.length <= 2 ? f.words.includes(token) : f.text.includes(token))
          best = Math.max(best, f.weight)
        else if (token.length >= 4 && f.words.some((w) => typoMatch(token, w)))
          best = Math.max(best, f.weight * 0.7)
      }
      if (best > 0) matched++
      score += best
    }
    return { entry, score, matched }
  })
  let results = scored.filter((s) => s.matched === tokens.length)
  if (results.length === 0) results = scored.filter((s) => s.matched > 0)
  results.sort((a, b) => b.score - a.score)
  return results.map(({ entry }) => ({ tool: entry.tool, badge: entry.badge }))
}

/** One tool as a row: its name, its one-line description, and where it sits. */
function ToolRow({
  tool,
  badge,
  onOpen,
  compact = false,
}: {
  tool: TrainingTool
  badge?: string
  onOpen: () => void
  /** The mark and the name alone, for the three-across row at the top. */
  compact?: boolean
}) {
  if (compact)
    return (
      <Link
        to={`/${tool.slug}`}
        onClick={onOpen}
        className="group flex items-center gap-2.5 px-3 py-2 transition-all hover:bg-white hover:shadow-card"
      >
        <span className="shrink-0">
          <ToolMark slug={tool.slug} />
        </span>
        <span className="min-w-0 text-[18px] font-bold leading-snug tracking-[-0.016em] text-stone-900 transition-colors group-hover:text-cardinal">
          {tool.label}
        </span>
      </Link>
    )

  return (
    <Link
      to={`/${tool.slug}`}
      onClick={onOpen}
      className="group flex items-center gap-3 px-3 py-2.5 transition-all hover:bg-white hover:shadow-card"
    >
      <span className="shrink-0 text-stone-400">
        <ToolMark slug={tool.slug} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[19px] font-bold tracking-[-0.016em] text-stone-900 transition-colors group-hover:text-cardinal">
          {tool.label}
        </span>
        {badge && (
          <span className="ml-2 text-[15px] font-semibold uppercase tracking-wider text-stone-400">
            {badge}
          </span>
        )}
        <span className="mt-0.5 block text-[17px] leading-relaxed text-stone-600">
          {tool.description}
        </span>
      </span>
      <ArrowRight
        size={15}
        className="shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-cardinal"
      />
    </Link>
  )
}

interface CatalogEntry {
  id: string
  title: string
  description: string
  tools: TrainingTool[]
  /** Position in the course. */
  number: number
}

/** The units in teaching order, numbered from one. */
const CATALOG: CatalogEntry[] = COURSE_UNITS.map((u, i) => ({
  id: u.id,
  title: u.title,
  description: u.description,
  tools: u.tools,
  number: i + 1,
}))

/*
 * One unit of the course, as a card that opens onto its tools. Folded, the
 * card is the unit's name alone, so the whole course fits on one screen;
 * open, it gives what the unit covers and lists its tools with what each one
 * does, the part a reader cannot guess from a name like "Your FICO Score".
 *
 * The first unit runs the full width, since its tools are the ones used
 * throughout the course rather than inside one topic. The rest sit two to a
 * row. The top card runs its three across on one line, the mark and the
 * name alone: those three are named plainly enough to need no sentence
 * each, and a description apiece would wrap to five lines in a third of the
 * width.
 */
function UnitCard({
  entry,
  open,
  onToggle,
  onOpen,
  wide = false,
}: {
  entry: CatalogEntry
  open: boolean
  onToggle: () => void
  onOpen: () => void
  /** The card at the top, whose tools run three across without descriptions. */
  wide?: boolean
}) {
  const panelId = `unit-panel-${entry.id}`

  return (
    /* Square, with a hairline and a soft drop: the treatment Stanford's own
       su-card uses on the Resource Hub pages this sits beside. */
    <div className="overflow-hidden border border-stone-200 bg-white shadow-card">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cardinal/10 text-[15px] font-bold text-cardinal">
            {entry.number}
          </span>
          <span className="min-w-0 flex-1 text-[20px] font-bold leading-snug tracking-[-0.016em] text-stone-900">
            {entry.title}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      {/* The panel stays in the document and hides, so the button's
          aria-controls always resolves to a real element. */}
      <div
        id={panelId}
        hidden={!open}
        className="border-t border-stone-100 bg-stone-50/60 px-3 pb-2 pt-2"
      >
        <p className="px-3 pb-3 text-[17px] leading-relaxed text-stone-600">
          {entry.description}
        </p>
        {entry.tools.length === 0 ? (
          <p className="px-3 py-2 text-[17px] text-stone-500">
            The tools for this unit are still being built.
          </p>
        ) : (
          <div className={wide ? 'grid gap-1 sm:grid-cols-3' : 'flex flex-col'}>
            {entry.tools.map((tool) => (
              <ToolRow key={tool.slug} tool={tool} onOpen={onOpen} compact={wide} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeacherTraining() {
  const [query, setQuery] = useState('')
  /*
   * One unit is open at a time, so the list never pushes itself past the
   * frame, and opening a second closes the first. Clicking the open one
   * closes it and leaves the course folded flat, which is a state worth
   * being able to reach.
   *
   * Basic Tools and Data starts open: its tools are the ones every other
   * unit leans on.
   */
  const [openId, setOpenId] = useState<string | null>(CATALOG[0]?.id ?? null)
  const framed = useFramed()
  const { isFull, enterUnlessDeclined } = useFullscreen()

  /*
   * Inside the iframe on ifdm.stanford.edu the toolkit has a narrow well and
   * a second scrollbar to work against, so opening a tool fills the screen.
   * A browser only grants that during a click, which is why the link asks on
   * its way out rather than the tool page asking once it has arrived. On the
   * full site the page already has the window and nothing needs to change.
   */
  const openTool = () => {
    if (framed) enterUnlessDeclined()
  }

  // A distinct document title for the course overview (WCAG 2.4.2).
  useEffect(() => {
    const prior = document.title
    document.title =
      'Personal Finance Toolkit | Stanford Initiative for Financial Decision-Making'
    return () => {
      document.title = prior
    }
  }, [])

  const q = normalize(query)
  const hits = useMemo<SearchHit[] | null>(() => (q ? runSearch(q) : null), [q])

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id))

  const [lead, ...others] = CATALOG

  return (
    <div>
      {/* Filling the screen, the banner and the bar would be two cardinal
          bands stacked on each other, so they become one: the name, the
          search, and the controls on a single row that stays put while the
          course scrolls under it. */}
      {isFull ? (
        <div className="sticky top-0 z-30 border-b border-white/15 bg-cardinal">
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
            <h1 className="min-w-0 shrink text-[18px] font-bold tracking-[-0.016em] text-white">
              The Personal Finance Toolkit
            </h1>
            <div className="relative ml-auto w-full max-w-[15rem] shrink">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the tools"
                aria-label="Search the tools"
                className="w-full border-0 bg-white py-2 pl-9 pr-3 text-[16px] text-stone-900 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
            <div className="shrink-0">
              <StageControls tone="dark" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-cardinal">
          <div className={`mx-auto max-w-7xl px-6 text-center ${framed ? 'pb-8 pt-7' : 'pb-11 pt-12'}`}>
            {/* Inside the IFDM site's iframe the host page carries the title,
                so the banner keeps it only for screen readers. */}
            <h1
              className={
                framed
                  ? 'sr-only'
                  : 'text-4xl md:text-5xl font-bold tracking-[-0.016em] text-white max-w-3xl mx-auto'
              }
            >
              The Personal Finance Toolkit
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-[20px] leading-relaxed text-white/85">
              Interactive tools for teaching personal finance.
            </p>
            <div className="relative mx-auto mt-6 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the tools"
                aria-label="Search the tools"
                className="w-full border-0 bg-white py-3 pl-10 pr-4 text-[18px] text-stone-900 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
          </div>
        </div>
      )}

      <div className={`mx-auto px-6 pb-6 pt-8 ${isFull ? 'w-full' : 'max-w-7xl'}`}>
        <div className="flex flex-col gap-x-10 gap-y-8 md:flex-row">
          {/* The hub's left rail stays alongside the toolkit, so arriving from
              ifdm.stanford.edu/resourcehub keeps the section's shell. Inside
              the IFDM site's iframe (?frame=1), and on a filled screen, the
              rail is either supplied by the host or out of place, so it goes. */}
          {!framed && !isFull && (
            <aside className="shrink-0 md:w-52">
              <div className="md:sticky md:top-6">
                <ResourceHubNav />
              </div>
            </aside>
          )}

          <div
            /* Filled, the screen is the width. A cap here left a fifth of a
               1920 display empty on either side. */
            className={`min-w-0 flex-1 ${isFull ? 'w-full' : 'max-w-5xl'} ${
              framed || isFull ? 'mx-auto w-full' : ''
            }`}
          >
            {/* Text size and the way to a filled screen sit in one place
                throughout the toolkit. Filled, they are up in the bar. */}
            {!isFull && (
              <div className="mb-3 flex justify-end">
                <StageControls />
              </div>
            )}
            {hits ? (
              <>
                <p className="mb-3 text-[17px] text-stone-600">
                  {hits.length === 0
                    ? 'No tools match that search.'
                    : hits.length === 1
                      ? '1 matching tool.'
                      : `${hits.length} matching tools.`}
                </p>
                <div className="border border-stone-200 bg-stone-50/70 p-2 shadow-card">
                  {hits.map(({ tool, badge }) => (
                    <ToolRow key={tool.slug} tool={tool} badge={badge} onOpen={openTool} />
                  ))}
                </div>
              </>
            ) : (
              /* Nothing sits between the search box and the cards, so Tab from
                 the search lands on the first unit. */
              <div className="flex flex-col gap-3">
                {lead && (
                  <UnitCard
                    entry={lead}
                    open={openId === lead.id}
                    onToggle={() => toggle(lead.id)}
                    onOpen={openTool}
                    wide
                  />
                )}
                {/* Two to a row, each card its own height, so opening one does
                    not stretch the one beside it. */}
                <div className="grid items-start gap-3 md:grid-cols-2">
                  {others.map((entry) => (
                    <UnitCard
                      key={entry.id}
                      entry={entry}
                      open={openId === entry.id}
                      onToggle={() => toggle(entry.id)}
                      onOpen={openTool}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
