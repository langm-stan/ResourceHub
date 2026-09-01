import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react'
import { COURSE_UNITS, FOUNDATION_TOOLS, unitForSlug } from '../data/teacherTraining'

/*
 * The toolkit's navigation as a runner across the top of a page, for the
 * frame view inside ifdm.stanford.edu where there is no sidebar. It is open
 * by default: a strip beneath the cardinal banner lists Foundations and the
 * ten units as chips, and the chosen unit's tools as links, opened on the
 * current unit. The banner button and a Hide link at the foot of the strip
 * both collapse it; whether it is open is remembered for the tab.
 */

const FOUNDATIONS = 'foundations'

/** The banner button that opens and closes the runner. */
export function ToolkitRunnerToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="toolkit-runner"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/20 transition-colors"
    >
      <LayoutGrid size={14} />
      {open ? 'Hide the tool list' : 'Show all tools'}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  )
}

const chipClass = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
    active ? 'bg-white text-cardinal shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
  }`

export default function ToolkitRunner({ slug, onHide }: { slug: string; onHide: () => void }) {
  const activeUnit = unitForSlug(slug)
  const [selectedId, setSelectedId] = useState(activeUnit?.id ?? FOUNDATIONS)
  const selectedUnit = COURSE_UNITS.find((u) => u.id === selectedId)
  const tools = selectedUnit ? selectedUnit.tools : FOUNDATION_TOOLS
  const heading = selectedUnit
    ? `Unit ${COURSE_UNITS.indexOf(selectedUnit) + 1}: ${selectedUnit.title}`
    : 'Foundations, used throughout the course'

  return (
    <nav id="toolkit-runner" aria-label="Toolkit navigation" className="border-t border-white/15">
      <div className="max-w-[1680px] mx-auto px-6 py-4 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(FOUNDATIONS)}
            aria-pressed={!selectedUnit}
            className={chipClass(!selectedUnit)}
          >
            Foundations
          </button>
          {COURSE_UNITS.map((u, i) => {
            const empty = u.tools.length === 0
            const active = selectedId === u.id
            if (empty)
              return (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/40"
                  title="Tools for this unit are in the works"
                >
                  <span className="h-5 w-5 rounded-full flex items-center justify-center font-serif text-[11px] font-semibold bg-white/10">
                    {i + 1}
                  </span>
                  {u.short}
                </span>
              )
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                aria-pressed={active}
                className={chipClass(active)}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center font-serif text-[11px] font-semibold ${
                    active ? 'bg-cardinal text-white' : 'bg-white/15 text-white'
                  }`}
                >
                  {i + 1}
                </span>
                {u.short}
              </button>
            )
          })}
        </div>

        <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
          {heading}
        </p>
        <ul className="flex flex-wrap justify-center gap-x-1 gap-y-1">
          {tools.map((t) => (
            <li key={t.slug}>
              <NavLink
                to={`/${t.slug}`}
                className={({ isActive }) =>
                  `inline-block rounded-md px-2.5 py-1 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 font-semibold text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onHide}
          className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ChevronUp size={12} />
          Hide the tool list
        </button>
      </div>
    </nav>
  )
}
