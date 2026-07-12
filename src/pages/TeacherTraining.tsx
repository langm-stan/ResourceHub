import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Sun, Sunset } from 'lucide-react'
import { FOUNDATION_TOOLS, TRAINING_DAYS, type TrainingSession } from '../data/teacherTraining'

/*
 * The Personal Finance Teacher Training Institute landing page: the daily
 * lecture schedule, one expandable card per session. Every link stays inside
 * /teacher-training so participants never fall out into the main Resource Hub.
 */

function SessionCard({ session }: { session: TrainingSession }) {
  const [open, setOpen] = useState(false)
  const hasTools = session.tools.length > 0
  const PeriodIcon = session.period === 'Morning' ? Sun : Sunset

  return (
    <div className="h-full flex flex-col rounded-2xl border border-stone-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex-1 flex items-center gap-4 p-5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-cardinal/10 text-cardinal">
          <PeriodIcon size={22} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-cardinal">
            {session.day} {session.period}
          </p>
          <h3 className="font-serif text-lg font-semibold text-stone-900 leading-snug">{session.lecture}</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            {session.speaker}
            {!hasTools && ' · materials coming soon'}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4">
          {hasTools ? (
            <div className="flex flex-col gap-2">
              {session.tools.map((t) => (
                <Link
                  key={t.slug}
                  to={`/teacher-training/${t.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-stone-200 p-4 hover:border-stone-300 hover:bg-stone-50 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{t.label}</p>
                    <p className="text-sm text-stone-600 leading-relaxed">{t.description}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-cardinal transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              Materials for this session will be posted here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function TeacherTraining() {
  return (
    <div>
      <div className="bg-cardinal">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-14">
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase mb-3">
            July 13-17, 2026 · Stanford University
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white max-w-3xl">
            Personal Finance Teacher Training Institute
          </h1>
          <div className="mt-4 max-w-3xl text-white/85 leading-relaxed space-y-1">
            <p>This page was built just for the Personal Finance Teacher Training Institute.</p>
            <p>
              The tools we had already designed are posted on the{' '}
              <a
                href="https://ifdm.stanford.edu/resourcehub"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white underline decoration-white/50 underline-offset-2 hover:decoration-white"
              >
                IFDM Resource Hub
              </a>
              .
            </p>
            <p>Eventually the two will be merged, but for now, please use both.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-12">
        <section>
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-serif text-2xl font-semibold text-stone-900">Foundations</h2>
            <p className="text-sm font-semibold uppercase tracking-widest text-stone-400">
              used throughout the week
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FOUNDATION_TOOLS.map((t) => (
              <Link
                key={t.slug}
                to={`/teacher-training/${t.slug}`}
                className="group flex flex-col gap-1.5 rounded-2xl border border-stone-200 bg-white shadow-card p-5 hover:border-stone-300 hover:bg-stone-50 transition-all"
              >
                <p className="font-serif text-lg font-semibold text-stone-900 leading-snug flex items-center gap-2">
                  {t.label}
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-cardinal transition-transform group-hover:translate-x-1"
                  />
                </p>
                <p className="text-sm text-stone-600 leading-relaxed">{t.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {TRAINING_DAYS.map(({ day, date, sessions }) => (
          <section key={day}>
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="font-serif text-2xl font-semibold text-stone-900">{day}</h2>
              <p className="text-sm font-semibold uppercase tracking-widest text-stone-400">{date}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
