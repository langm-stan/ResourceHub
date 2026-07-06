import { useState } from 'react'
import ResourceHubShell from '../components/ResourceHubShell'
import VideoLightbox from '../components/VideoLightbox'
import { FACULTY_VIDEOS } from '../data/facultyInsights'
import { GraduationCap, Play } from 'lucide-react'

export default function FacultyInsights() {
  const [active, setActive] = useState<{ videoId: string; title: string } | null>(null)

  return (
    <ResourceHubShell
      title="Faculty Insights"
      intro="Short personal finance lessons from Mastering Financial Decision-Making, the course Professor Annamaria Lusardi teaches at Stanford, shared here to help democratize financial education."
    >
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-8 flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-cardinal/10 text-cardinal flex items-center justify-center shrink-0">
          <GraduationCap size={22} />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-900 mb-1">Mastering Financial Decision-Making</h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Professor Lusardi directs IFDM, a collaboration between the Stanford Institute for Economic Policy
            Research, the Graduate School of Business, and the Department of Economics. In her classroom she uses lectures, data
            analyses, case studies, and humor to help students master the concepts that underpin
            financial security: saving, investing, managing debt, and protecting against risk. Faculty Insights
            brings those same lessons to anyone, not just students enrolled in the course.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FACULTY_VIDEOS.map((v) => (
          <button
            key={v.videoId}
            onClick={() => setActive(v)}
            className="group flex flex-col text-left rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-all"
          >
            <div className="relative bg-stone-900 aspect-[2/1]">
              <img
                src={v.thumbnail}
                alt={v.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="h-11 w-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play size={17} className="text-cardinal ml-0.5" fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm font-semibold text-stone-900 leading-snug">{v.title}</p>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cardinal">
                <Play size={11} fill="currentColor" />
                Watch the video
              </span>
            </div>
          </button>
        ))}
      </div>

      {active && <VideoLightbox videoId={active.videoId} title={active.title} onClose={() => setActive(null)} />}
    </ResourceHubShell>
  )
}
