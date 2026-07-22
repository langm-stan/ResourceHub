import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { adjacentTools, COURSE_UNITS, FOUNDATION_TOOLS, unitForSlug } from '../data/teacherTraining'

/*
 * The teaching toolkit counterpart to ResourceHubShell, styled to match the
 * toolkit landing page: a slim cardinal band carries the page's eyebrow,
 * serif title, and one-line intro; the sidebar navigates the course's units
 * in the landing page's chip vocabulary (numbered circles, only units with
 * tools, the current unit expanded); and prev/next cards at the bottom walk
 * the course in order. Navigation always leads back to the course overview,
 * never into the main Resource Hub.
 */

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
    isActive
      ? 'bg-cardinal/10 text-cardinal font-semibold'
      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`
}

export default function TeacherTrainingShell({
  children,
  title,
  eyebrow = 'Teaching Toolkit',
  intro,
  wide = false,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  intro?: string
  /** Widen the content column for pages built around charts and side rails. */
  wide?: boolean
}) {
  const location = useLocation()
  const slug = location.pathname.replace(/^\/teacher-training\/?/, '')
  const activeUnit = unitForSlug(slug)
  const [openId, setOpenId] = useState<string | null>(activeUnit?.id ?? null)
  const { prev, next } = adjacentTools(slug)

  return (
    <div>
      <div className="bg-cardinal">
        <div className="max-w-[1680px] mx-auto px-6 py-8">
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase mb-2">
            {eyebrow}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-white">{title}</h1>
          {intro && <p className="mt-3 max-w-3xl text-white/85 leading-relaxed">{intro}</p>}
        </div>
      </div>

      <div className="max-w-[1680px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-x-10 gap-y-6">
          <aside className="md:w-56 shrink-0">
            <nav className="flex flex-row md:flex-col gap-1 flex-wrap sticky top-6">
              <Link
                to="/teacher-training"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-cardinal hover:bg-cardinal/5 transition-colors"
              >
                <ArrowLeft size={15} />
                Course Overview
              </Link>

              <p className="px-3 pt-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 w-full md:w-auto">
                Foundations
              </p>
              {FOUNDATION_TOOLS.map((t) => (
                <NavLink key={t.slug} to={`/teacher-training/${t.slug}`} className={navLinkClass}>
                  {t.label}
                </NavLink>
              ))}

              <p className="px-3 pt-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 w-full md:w-auto">
                Units
              </p>
              {COURSE_UNITS.map((u, i) => {
                if (u.tools.length === 0) return null
                const open = openId === u.id
                const current = activeUnit?.id === u.id
                return (
                  <div key={u.id} className="contents md:flex md:flex-col md:gap-1">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : u.id)}
                      aria-expanded={open}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-left hover:bg-stone-100 transition-colors"
                    >
                      <span
                        className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center font-serif text-xs font-semibold ${
                          current ? 'bg-cardinal text-white' : 'bg-cardinal/10 text-cardinal'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] font-medium text-stone-700 leading-snug">
                        {u.short}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {open &&
                      u.tools.map((t) => (
                        <NavLink
                          key={t.slug}
                          to={`/teacher-training/${t.slug}`}
                          className={(state) => `md:ml-6 ${navLinkClass(state)}`}
                        >
                          {t.label}
                        </NavLink>
                      ))}
                  </div>
                )
              })}
            </nav>
          </aside>

          <div className={`flex-1 min-w-0 ${wide ? '' : 'max-w-5xl'}`}>
            {children}

            {(prev || next) && (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prev ? (
                  <Link
                    to={`/teacher-training/${prev.tool.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white shadow-card px-5 py-4 hover:border-stone-300 hover:bg-stone-50 transition-all"
                  >
                    <ArrowLeft
                      size={16}
                      className="shrink-0 text-cardinal transition-transform group-hover:-translate-x-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        Previous · {prev.badge}
                      </span>
                      <span className="block font-serif font-semibold text-stone-900 leading-snug">
                        {prev.tool.label}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {next && (
                  <Link
                    to={`/teacher-training/${next.tool.slug}`}
                    className="group flex items-center justify-end gap-3 rounded-xl border border-stone-200 bg-white shadow-card px-5 py-4 text-right hover:border-stone-300 hover:bg-stone-50 transition-all"
                  >
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        Next · {next.badge}
                      </span>
                      <span className="block font-serif font-semibold text-stone-900 leading-snug">
                        {next.tool.label}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-cardinal transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
