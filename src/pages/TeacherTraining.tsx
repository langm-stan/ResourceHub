import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { COURSE_UNITS, FOUNDATION_TOOLS, type TrainingTool } from '../data/teacherTraining'

/*
 * The Personal Finance Teaching Toolkit landing page. The course's units run
 * as a single even path across the page, joined by connector ticks and
 * resting on the Foundations slab that spans the base; selecting a unit (or
 * searching from the hero) fills the detail panel below with that unit's
 * tools. Every link stays inside /teacher-training so teachers never fall
 * out into the main Resource Hub.
 */

const FOUNDATIONS_DESC =
  'Four tools used throughout the course: the questions that anchor it, the calculator behind it, and two ways to take stock.'

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

function ToolCard({ tool, badge }: { tool: TrainingTool; badge?: string }) {
  return (
    <Link
      to={`/teacher-training/${tool.slug}`}
      className="group flex flex-col gap-1.5 rounded-2xl border border-stone-200 bg-white shadow-card p-5 hover:border-stone-300 hover:bg-stone-50 transition-all"
    >
      <p className="font-serif text-lg font-semibold text-stone-900 leading-snug flex items-center gap-2">
        {tool.label}
        <ArrowRight
          size={16}
          className="shrink-0 text-cardinal transition-transform group-hover:translate-x-1"
        />
      </p>
      <p className="text-sm text-stone-600 leading-relaxed">{tool.description}</p>
      {badge && (
        <p className="mt-auto pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          {badge}
        </p>
      )}
    </Link>
  )
}

export default function TeacherTraining() {
  const [selectedId, setSelectedId] = useState('foundations')
  const [query, setQuery] = useState('')

  const q = normalize(query)
  const hits = useMemo<SearchHit[] | null>(() => (q ? runSearch(q) : null), [q])

  const selectedIndex = COURSE_UNITS.findIndex((u) => u.id === selectedId)
  const selectedUnit = selectedIndex >= 0 ? COURSE_UNITS[selectedIndex]! : undefined
  const foundationsActive = !hits && !selectedUnit

  const panel = hits
    ? {
        eyebrow: 'Search',
        title: `“${query.trim()}”`,
        desc:
          hits.length === 0
            ? 'No tools match that search.'
            : hits.length === 1
              ? 'One matching tool.'
              : `${hits.length} matching tools.`,
        cards: hits,
      }
    : selectedUnit
      ? {
          eyebrow: `Unit ${selectedIndex + 1}`,
          title: selectedUnit.title,
          desc: selectedUnit.description,
          cards: selectedUnit.tools.map((tool) => ({ tool, badge: undefined })),
        }
      : {
          eyebrow: 'Used throughout the course',
          title: 'Foundations',
          desc: FOUNDATIONS_DESC,
          cards: FOUNDATION_TOOLS.map((tool) => ({ tool, badge: undefined })),
        }

  return (
    <div>
      <div className="bg-cardinal">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-14 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase mb-3">
            Stanford · Initiative for Financial Decision-Making
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white max-w-3xl mx-auto">
            The Personal Finance Teaching Toolkit
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-white/85 leading-relaxed">
            Interactive tools for teaching personal finance, arranged as a course. Start with the
            foundations at the base, then take the units in the order you would teach them. Every
            tool runs in the browser, and each tool page shows how to embed it in your own slides.
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
        <div className="flex flex-col lg:flex-row gap-2">
          {COURSE_UNITS.map((u, i) => {
            const active = !hits && i === selectedIndex
            // The joint before this unit is cardinal once the course has flowed past it.
            const flowed = !hits && (foundationsActive || i <= selectedIndex)
            return (
              <div key={u.id} className="relative lg:flex-1 lg:min-w-0">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`hidden lg:block absolute -left-2 top-1/2 -translate-y-1/2 h-px w-2 ${
                      flowed ? 'bg-cardinal/50' : 'bg-stone-300'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId(u.id)}
                  aria-pressed={active}
                  className={`w-full lg:h-[112px] flex lg:flex-col items-center lg:justify-center gap-3 lg:gap-2 rounded-xl border px-3.5 py-3 text-left lg:text-center transition-all ${
                    active
                      ? 'bg-cardinal border-cardinal text-white shadow-md'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center font-serif text-sm font-semibold ${
                      active ? 'bg-white/15 text-white' : 'bg-cardinal/10 text-cardinal'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[13px] font-medium leading-snug ${active ? 'text-white' : 'text-stone-700'}`}
                  >
                    {u.short}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="relative mt-6">
          <span
            aria-hidden
            className={`hidden lg:block absolute left-1/2 -top-6 h-6 w-px ${
              !hits ? 'bg-cardinal/50' : 'bg-stone-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setSelectedId('foundations')}
            aria-pressed={foundationsActive}
            className={`w-full flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 rounded-xl border-2 px-5 py-4 text-center transition-all ${
              foundationsActive
                ? 'bg-cardinal border-cardinal text-white shadow-md'
                : 'bg-stone-100 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span
              className={`font-serif text-lg font-semibold ${foundationsActive ? 'text-white' : 'text-stone-900'}`}
            >
              Foundations
            </span>
            <span className={`text-xs ${foundationsActive ? 'text-white/80' : 'text-stone-500'}`}>
              Used throughout the course
            </span>
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-stone-400">Select a unit to see its tools</p>

        <div className="mt-12">
          <p className="text-xs font-semibold tracking-widest text-cardinal uppercase">
            {panel.eyebrow}
          </p>
          <h2 className="font-serif text-3xl font-semibold text-stone-900 mt-1">{panel.title}</h2>
          <p className="text-stone-600 mt-2 max-w-2xl leading-relaxed">{panel.desc}</p>
          {panel.cards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {panel.cards.map(({ tool, badge }) => (
                <ToolCard key={tool.slug} tool={tool} badge={badge} />
              ))}
            </div>
          ) : (
            !hits && (
              <p className="text-sm text-stone-500 mt-6">
                The tools for this unit are still being built. The foundation tools cover it in the
                meantime.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
