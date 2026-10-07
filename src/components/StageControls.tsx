import { Maximize2, Minimize2 } from 'lucide-react'
import { PresentationToggle } from '../design-system'
import { useFramed } from '../hooks/useFramed'
import { useLocation } from 'react-router-dom'
import {
  cameFromHost,
  exitToHost,
  inIframe,
  onPhone,
  setPhoneExpanded,
  standaloneAppUrl,
  usePhoneExpanded,
} from '../hooks/useAppView'
import { isNativeApp } from '../lib/nativeApp'
import { useFullscreen } from './FullscreenProvider'
import styles from './StageControls.module.css'

/*
 * Text size and the way in and out of a filled screen, as one pair. They sit
 * in the same place throughout the toolkit: on the cardinal bar in the framed
 * view, above the tool on the full site.
 */

/*
 * A phone has no full screen to give (an iPhone's browser offers none), and
 * filling a small screen that is already full only steps the text up. What
 * helps there is losing the IFDM site's header and footer, so on a phone the
 * button opens the app view instead (see useAppView) and closes it again.
 *
 * Inside the IFDM site's iframe the page cannot grow past its frame, so the
 * button is a link instead: it replaces the host page with the toolkit on
 * its own, already in the app view, and Exit there goes back to the IFDM
 * page. The app itself is always in the app view and has no button.
 */
function PhoneExpandButton({ tone }: { tone: 'light' | 'dark' }) {
  const expanded = usePhoneExpanded()
  const framed = useFramed()
  const { pathname } = useLocation()
  if (isNativeApp) return null
  if (inIframe) {
    return (
      <a
        href={standaloneAppUrl(pathname)}
        target="_top"
        className={`${styles.button} ${tone === 'dark' ? styles.dark : ''}`}
        title="Open the toolkit on its own, outside this page"
      >
        <Maximize2 size={14} />
        Expand
      </a>
    )
  }
  if (framed && !expanded) return null
  return (
    <button
      type="button"
      onClick={() => {
        if (expanded && cameFromHost) exitToHost()
        else setPhoneExpanded(!expanded)
      }}
      className={`${styles.button} ${tone === 'dark' ? styles.dark : ''}`}
      title={
        expanded
          ? cameFromHost
            ? 'Back to the IFDM site'
            : 'Back to the full site'
          : 'Show the toolkit on its own'
      }
    >
      {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      {expanded ? 'Exit' : 'Expand'}
    </button>
  )
}

export function StageControls({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { isFull, canFullscreen, toggle } = useFullscreen()
  const showFill = isFull || !onPhone

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
      {onPhone && !isFull && <PhoneExpandButton tone={tone} />}
      {showFill && (
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
      )}
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

/*
 * The way out, repeated at the foot of the page.
 *
 * The bar at the top carries the same control, but a filled screen is a page
 * scrolled to the end of, and a reader who has reached the bottom should not
 * have to travel back up to leave. It appears only on a filled screen, since
 * there is nothing to leave otherwise.
 */
export function ExitFullScreenFooter() {
  const { isFull, exit } = useFullscreen()
  if (!isFull) return null

  return (
    <div className={styles.footer}>
      <button type="button" onClick={exit} className={styles.footerButton}>
        <Minimize2 size={17} />
        Exit full screen
      </button>
    </div>
  )
}
