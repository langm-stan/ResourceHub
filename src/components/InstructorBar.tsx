import { useState } from 'react'
import { PresentationToggle } from '../design-system'

/*
 * Classroom support, shared by the Calculators and Interactive Lessons pages.
 * Each chart also carries its own PNG download control (hover the chart) for
 * pasting a single figure into a deck.
 */
export default function InstructorBar({
  route,
  toolKey,
  toolLabel,
  path,
}: {
  /** Hash route the tool lives under, e.g. "calculators" or "lessons". */
  route?: string
  toolKey?: string
  toolLabel: string
  /** Full hash path override for tools that live outside the ?tool= pages, e.g. "teacher-training/gambling-investing". */
  path?: string
}) {
  const [copied, setCopied] = useState<'embed' | 'link' | null>(null)

  const hashPath = path ?? `${route}?tool=${toolKey}`
  const baseUrl = `${window.location.origin}${window.location.pathname}#/${hashPath}`
  const embedUrl = `${baseUrl}${hashPath.includes('?') ? '&' : '?'}embed=1`
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="760" style="border: none;" title="${toolLabel}"></iframe>`

  const copy = (kind: 'embed' | 'link', text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
        For instructors
      </p>
      <p className="text-sm text-stone-600 mb-4 max-w-2xl">
        Use {toolLabel} in class three ways: enlarge the interface for projection, embed the live tool
        in slides or a course page, or hover any chart and use its download control to save a PNG
        figure for a deck.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="toolkitScope">
          <PresentationToggle />
        </div>
        <button
          onClick={() => copy('embed', embedCode)}
          className="border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
        >
          {copied === 'embed' ? 'Embed code copied ✓' : 'Copy embed code (iframe)'}
        </button>
        <button
          onClick={() => copy('link', baseUrl)}
          className="border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
        >
          {copied === 'link' ? 'Link copied ✓' : 'Copy a direct link'}
        </button>
        <a
          href={embedUrl}
          target="_blank"
          rel="noreferrer"
          className="border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
        >
          Preview the embed view
        </a>
      </div>
    </div>
  )
}
