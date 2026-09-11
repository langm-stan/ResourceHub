/*
 * Classroom notes for a tool page.
 *
 * Nothing here links out, and nothing here hands out a URL. The toolkit is
 * served from a personal GitHub Pages account and runs inside an iframe on
 * ifdm.stanford.edu, where a visitor sees the Stanford address. Anything that
 * opened a new tab would replace that with the GitHub one, so the way to
 * enlarge a tool is the size control on this page and the expand button on
 * each chart, both of which stay inside the frame.
 */

export default function InstructorBar({ toolLabel }: { toolLabel: string }) {
  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
        For instructors
      </p>
      <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
        The size control at the top of the page scales {toolLabel} for a projector, or shrinks it
        to fit more on screen. Each chart has an expand button for full width, and downloads as a
        PNG for a slide.
      </p>
    </div>
  )
}
