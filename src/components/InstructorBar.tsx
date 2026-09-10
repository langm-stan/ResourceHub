/*
 * Classroom support for a tool page.
 *
 * There is deliberately nothing here that hands out a URL. The toolkit is
 * served from a personal GitHub Pages account, so an embed snippet or a
 * copied link would spread that address as the home of a Stanford resource,
 * and every one of those links would break the day the site moves to a
 * Stanford domain. What a teacher needs in class is the tool by itself and a
 * picture of a chart, and both of those are here.
 *
 * The size control for projecting sits at the top of the page instead, next
 * to the tool it resizes (see TeacherTrainingSection).
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
  /** Full hash path override for tools that live outside the ?tool= pages. */
  path?: string
}) {
  const hashPath = path ?? `${route}?tool=${toolKey}`
  // embed=1 renders the tool alone, with no banner or navigation around it.
  const soloUrl = `${window.location.origin}${window.location.pathname}#/${hashPath}${
    hashPath.includes('?') ? '&' : '?'
  }embed=1`

  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
        For instructors
      </p>
      <p className="text-sm text-stone-600 mb-4 max-w-2xl">
        Open {toolLabel} on its own for projecting, and hover any chart to download it as a PNG for
        a slide. Use the size control at the top of the page to fit more on screen or to enlarge it
        for a room.
      </p>
      <a
        href={soloUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
      >
        Open {toolLabel} on its own
      </a>
    </div>
  )
}
