import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { COURSE_UNITS, type TrainingTool } from '../data/teacherTraining'
import ResourceHubNav from '../components/ResourceHubNav'
import { useFullscreen } from '../components/FullscreenProvider'
import { ExitFullScreenFooter, StageControls } from '../components/StageControls'
import { ToolMark } from '../components/ToolMark'
import { UnitCatalog } from '../components/UnitCatalog'
import { useFramed } from '../hooks/useFramed'

/*
 * The Personal Finance Teaching Toolkit landing page: the units in teaching
 * order as cards (see UnitCatalog), each opening onto its tools. Searching
 * from the banner replaces the cards with the matching tools.
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

/*
 * The names of the topics combined into each unit stay searchable, so
 * "FICO score" still finds its tool though no unit carries that name.
 */
const SEARCH_INDEX: SearchEntry[] = COURSE_UNITS.flatMap((u, i) =>
  u.tools.map((t) =>
    searchEntry(
      t,
      `Unit ${i + 1} · ${u.short}`,
      `unit ${i + 1} ${u.title} ${u.short} ${u.topics.join(' ')}`,
    ),
  ),
)

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

export default function TeacherTraining() {
  const [query, setQuery] = useState('')
  const framed = useFramed()
  const { isFull } = useFullscreen()

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

  return (
    <div>
      {/* Filling the screen, the banner and the bar would be two cardinal
          bands stacked on each other, so they become one: the name and the
          tagline, the search, and the controls on a single row that stays put
          while the course scrolls under it. */}
      {isFull ? (
        <div className="sticky top-0 z-30 border-b border-white/15 bg-cardinal">
          {/* Filling the screen puts this against the top edge, where a
              browser's own toolbar slides down over it and takes the search
              box with it. The band still reaches the edge; its contents sit
              clear of it. */}
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2 pt-8">
            <h1 className="min-w-0 shrink text-[18px] font-bold tracking-[-0.016em] text-white">
              The Personal Finance Toolkit
            </h1>
            <p className="min-w-0 shrink text-[18px] text-white/85">
              Interactive tools for teaching personal finance.
            </p>
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
            <p className="mx-auto mt-4 max-w-3xl text-[24px] leading-snug text-white/90 md:text-[30px]">
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

      <div className={`mx-auto px-6 pb-6 pt-8 ${framed || isFull ? 'w-full' : 'max-w-7xl'}`}>
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
            /* Without the site's own chrome around it, the window is the
               width. The cap here was chosen for the 880px iframe, where it
               never binds; in a wide window it was throwing away 448px on
               either side. */
            className={`min-w-0 flex-1 ${
              framed || isFull ? 'mx-auto w-full' : 'max-w-5xl'
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
                    <ToolRow key={tool.slug} tool={tool} badge={badge} />
                  ))}
                </div>
              </>
            ) : (
              /* Nothing sits between the search box and the cards, so Tab from
                 the search lands on the first unit. */
              <UnitCatalog />
            )}
            <p className="mt-10 border-t border-stone-200 pt-5 text-center text-[17px] leading-relaxed text-stone-600">
              To ask about the toolkit or tell us how you use it in your classroom, write to{' '}
              <a
                href="mailto:stanfordifdm@stanford.edu"
                className="font-semibold text-cardinal hover:underline"
              >
                stanfordifdm@stanford.edu
              </a>
              .
            </p>
            <ExitFullScreenFooter />
          </div>
        </div>
      </div>
    </div>
  )
}
