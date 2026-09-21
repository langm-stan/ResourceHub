import { Maximize2, Minimize2 } from 'lucide-react'
import { PresentationToggle } from '../design-system'
import { useFramed } from '../hooks/useFramed'
import { useFullscreen } from './FullscreenProvider'
import styles from './StageControls.module.css'

/*
 * Text size and the way in and out of a filled screen, as one pair. They sit
 * in the same place throughout the toolkit: on the cardinal bar in the framed
 * view, above the tool on the full site.
 */

export function StageControls({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { isFull, canFullscreen, toggle } = useFullscreen()

  return (
    <div className={styles.group}>
      {/* The control shows a bare percentage, which reads like the browser's
          own zoom. The name says which one it is. It repeats the group's
          aria-label, so it is hidden from a screen reader rather than said
          twice, and it steps aside on a narrow bar. */}
      <span
        aria-hidden="true"
        className={`hidden text-[13px] sm:inline ${
          tone === 'dark' ? 'text-white/75' : 'text-stone-500'
        }`}
      >
        Text size
      </span>
      <PresentationToggle tone={tone} />
      <button
        type="button"
        onClick={toggle}
        className={`${styles.button} ${tone === 'dark' ? styles.dark : ''}`}
        title={
          isFull
            ? 'Back to the page'
            : canFullscreen
              ? 'Fill the screen'
              : 'Fill the frame. This page cannot reach full screen unless the site it sits in allows it.'
        }
      >
        {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {isFull ? 'Exit full screen' : canFullscreen ? 'Full screen' : 'Expand'}
      </button>
    </div>
  )
}

/*
 * The same pair set above the page's content, for the full site. In the framed
 * view, and on a filled screen, the cardinal bar at the top carries them
 * instead, so a page never shows two sets a scroll apart.
 */
export function StageControlsRow() {
  const framed = useFramed()
  const { isFull } = useFullscreen()
  if (framed || isFull) return null
  return (
    <div className={styles.row}>
      <StageControls />
    </div>
  )
}

