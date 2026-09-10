import { useState } from 'react'

/*
 * Classroom support for a tool page. The size control sits at the top of the
 * page (see TeacherTrainingSection); what remains here is the pair of links a
 * teacher takes away.
 *
 * Copying is not guaranteed: the clipboard API refuses when the document is
 * not focused, and a page embedded in another site cannot reach the clipboard
 * at all unless that site grants permission. So every copy is checked, and
 * when it fails the text is put on screen for the reader to take by hand
 * rather than claiming a success that did not happen.
 */

type Kind = 'embed' | 'link'

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

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
  const [copied, setCopied] = useState<Kind | null>(null)
  const [fallback, setFallback] = useState<{ kind: Kind; text: string } | null>(null)

  const hashPath = path ?? `${route}?tool=${toolKey}`
  const baseUrl = `${window.location.origin}${window.location.pathname}#/${hashPath}`
  const embedUrl = `${baseUrl}${hashPath.includes('?') ? '&' : '?'}embed=1`
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="760" style="border: none;" title="${toolLabel}"></iframe>`

  const copy = async (kind: Kind, text: string) => {
    setFallback(null)
    if (await writeToClipboard(text)) {
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1800)
    } else {
      setFallback({ kind, text })
    }
  }

  const btn =
    'border border-stone-300 text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors'

  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
        For instructors
      </p>
      <p className="text-sm text-stone-600 mb-4 max-w-2xl">
        Take {toolLabel} away as a link, or embed it in slides or a course page. Hover any chart to
        download it as a PNG.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => void copy('embed', embedCode)} className={btn}>
          {copied === 'embed' ? 'Embed code copied ✓' : 'Copy embed code (iframe)'}
        </button>
        <button onClick={() => void copy('link', baseUrl)} className={btn}>
          {copied === 'link' ? 'Link copied ✓' : 'Copy a direct link'}
        </button>
        <a href={embedUrl} target="_blank" rel="noreferrer" className={btn}>
          Preview the embed view
        </a>
      </div>

      {fallback && (
        <div className="mt-4">
          <label
            htmlFor="instructor-copy-fallback"
            className="block text-xs text-stone-600 mb-1.5"
          >
            This browser would not let the page reach the clipboard. Here is the{' '}
            {fallback.kind === 'embed' ? 'embed code' : 'link'} to copy by hand.
          </label>
          <textarea
            id="instructor-copy-fallback"
            readOnly
            rows={fallback.kind === 'embed' ? 3 : 1}
            value={fallback.text}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-stone-300 bg-stone-50 p-2 font-mono text-xs text-stone-800"
          />
        </div>
      )}
    </div>
  )
}
