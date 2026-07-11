import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { FOUNDATION_TOOLS, TRAINING_SESSIONS, sessionForSlug } from '../data/teacherTraining'

/*
 * The teacher training counterpart to ResourceHubShell: same layout and look,
 * but the sidebar navigates the institute's sessions and always leads back to
 * the training schedule, never into the main Resource Hub. The foundation
 * resources stay pinned on top; the days sit compressed below, one row per
 * session with a brief title, and only the current session starts expanded.
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
  eyebrow = 'Teacher Training Institute',
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
  const activeSession = sessionForSlug(slug)
  const [openId, setOpenId] = useState<string | null>(activeSession?.id ?? null)

  return (
    <div className="max-w-[1680px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-x-10 gap-y-6">
        <aside className="md:w-56 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 flex-wrap sticky top-6">
            <Link
              to="/teacher-training"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-cardinal hover:bg-cardinal/5 transition-colors"
            >
              <ArrowLeft size={15} />
              Training Schedule
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
              Sessions
            </p>
            {TRAINING_SESSIONS.filter((s) => s.tools.length > 0).map((s) => {
              const open = openId === s.id
              return (
                <div key={s.id} className="contents md:flex md:flex-col md:gap-1">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : s.id)}
                    aria-expanded={open}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-left hover:bg-stone-100 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        {s.day} {s.period}
                      </span>
                      <span className="block text-[13px] font-medium text-stone-700 leading-snug">
                        {s.short}
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open &&
                    s.tools.map((t) => (
                      <NavLink
                        key={t.slug}
                        to={`/teacher-training/${t.slug}`}
                        className={(state) => `md:ml-3 ${navLinkClass(state)}`}
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
          <p className="text-xs font-semibold tracking-widest text-cardinal uppercase mb-2">{eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-4">{title}</h1>
          {intro && <p className="text-stone-600 max-w-3xl text-lg mb-10 leading-relaxed">{intro}</p>}
          {!intro && <div className="mb-10" />}
          {children}
        </div>
      </div>
    </div>
  )
}
