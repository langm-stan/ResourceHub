import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Search } from 'lucide-react'
import { COURSE_UNITS, FOUNDATION_TOOLS, type TrainingTool } from '../data/teacherTraining'
import ResourceHubNav from '../components/ResourceHubNav'
import { useFramed } from '../hooks/useFramed'

/*
 * The Personal Finance Teaching Toolkit landing page: a catalog of the
 * tools as one vertical list. Foundations lead, unnumbered because they
 * sit outside the sequence, then the fourteen units in teaching order.
 * Every row is visible at once and opens onto that unit's description and
 * tools; Expand all opens the whole catalog. Searching from the hero
 * replaces the list with the matching tools.
 */

const FOUNDATIONS_DESC = 'Used throughout the course.'

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
  ...FOUNDATION_TOOLS.map((t) => searchEntry(t, 'Foundations', 'foundations')),
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
function ToolRow({ tool, badge }: { tool: TrainingTool; badge?: string }) {
  return (
    <Link
      to={`/${tool.slug}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-white hover:shadow-card"
    >
      <span className="min-w-0 flex-1">
        <span className="font-serif text-[15px] font-semibold text-stone-900 transition-colors group-hover:text-cardinal">
          {tool.label}
        </span>
        {badge && (
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            {badge}
          </span>
        )}
        <span className="mt-0.5 block text-sm leading-relaxed text-stone-600">
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
  /** Position in the course. Omitted for Foundations, which has no number. */
  number?: number
}

/** Foundations first, then the units in teaching order. */
const CATALOG: CatalogEntry[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    description: FOUNDATIONS_DESC,
    tools: FOUNDATION_TOOLS,
  },
  ...COURSE_UNITS.map((u, i) => ({
    id: u.id,
    title: u.title,
    description: u.description,
    tools: u.tools,
    number: i + 1,
  })),
]

/** One row of the catalog: a header that opens onto its description and tools. */
function CatalogRow({
  entry,
  open,
  onToggle,
}: {
  entry: CatalogEntry
  open: boolean
  onToggle: () => void
}) {
  const count = entry.tools.length
  const panelId = `catalog-panel-${entry.id}`

  return (
    <div className="border-b border-stone-200 last:border-b-0">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3.5 px-3 py-3 text-left transition-colors hover:bg-stone-50"
        >
          {entry.number === undefined ? (
            <span className="h-7 w-7 shrink-0" aria-hidden="true" />
          ) : (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-[13px] font-semibold ${
                count === 0 ? 'bg-stone-100 text-stone-400' : 'bg-cardinal/10 text-cardinal'
              }`}
            >
              {entry.number}
            </span>
          )}
          <span className="min-w-0 flex-1 font-serif text-[17px] font-semibold leading-snug text-stone-900">
            {entry.title}
          </span>
          <span className="hidden shrink-0 text-xs text-stone-400 sm:block">
            {count === 0 ? 'In development' : count === 1 ? '1 tool' : `${count} tools`}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      {/* The panel stays in the document and hides, so the button's
          aria-controls always resolves to a real element. */}
      <div id={panelId} hidden={!open} className="px-3 pb-4 sm:pl-[3.375rem]">
          <p className="mb-2 max-w-3xl text-sm leading-relaxed text-stone-600">
            {entry.description}
          </p>
          {count === 0 ? (
            <p className="px-3 text-sm text-stone-500">
              The tools for this unit are still being built.
            </p>
          ) : (
            <div className="flex flex-col">
              {entry.tools.map((tool) => (
                <ToolRow key={tool.slug} tool={tool} />
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

export default function TeacherTraining() {
  const [query, setQuery] = useState('')
  // Foundations starts open so the top of the list shows what a row does.
  const [openIds, setOpenIds] = useState<string[]>([CATALOG[0]!.id])
  const framed = useFramed()

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

  const toggle = (id: string) =>
    setOpenIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  return (
    <div>
      <div className="bg-cardinal">
        <div className={`max-w-7xl mx-auto px-6 pb-14 text-center ${framed ? 'pt-9' : 'pt-12'}`}>
          {/* Inside the IFDM site's iframe the host page carries the title,
              so the banner keeps it only for screen readers. */}
          <h1
            className={
              framed
                ? 'sr-only'
                : 'font-serif text-4xl md:text-5xl font-semibold text-white max-w-3xl mx-auto'
            }
          >
            The Personal Finance Toolkit
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-white/85 leading-relaxed">
            Interactive tools for teaching personal finance, organized by unit.
          </p>
          <div className="relative mt-7 max-w-md mx-auto">
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
              className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-[15px] text-stone-900 placeholder:text-stone-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-x-10 gap-y-8">
          {/* The hub's left rail stays alongside the toolkit, so arriving from
              ifdm.stanford.edu/resourcehub keeps the section's shell. Inside
              the IFDM site's iframe (?frame=1) the host page shows the real
              rail, so it is left out. */}
          {!framed && (
            <aside className="md:w-52 shrink-0">
              <div className="md:sticky md:top-6">
                <ResourceHubNav />
              </div>
            </aside>
          )}

          {/* With no sidebar the list is centered in the well; alongside the
              sidebar it stays where the sidebar leaves it. */}
          <div className={`flex-1 min-w-0 max-w-4xl ${framed ? 'mx-auto w-full' : ''}`}>
            {hits ? (
              <>
                <p className="mb-3 text-sm text-stone-600">
                  {hits.length === 0
                    ? 'No tools match that search.'
                    : hits.length === 1
                      ? '1 matching tool.'
                      : `${hits.length} matching tools.`}
                </p>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-2">
                  {hits.map(({ tool, badge }) => (
                    <ToolRow key={tool.slug} tool={tool} badge={badge} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Nothing sits between the search box and the list, so Tab
                    from the search lands on the first row. */}
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {CATALOG.map((entry) => (
                    <CatalogRow
                      key={entry.id}
                      entry={entry}
                      open={openIds.includes(entry.id)}
                      onToggle={() => toggle(entry.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
