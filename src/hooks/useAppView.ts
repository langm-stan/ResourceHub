import { useSyncExternalStore } from 'react'
import { isNativeApp } from '../lib/nativeApp'

/*
 * The app view: the toolkit as the iPhone and iPad app shows it. The Stanford
 * lockup sits at the top, then the cardinal banner and the content, with none
 * of the IFDM site's navigation or footer around them.
 *
 * The app is always in this view. On the website a phone reaches the same
 * view with the Expand button, where real full screen is not on offer (an
 * iPhone's browser has none to give) and the site's desktop header takes up
 * most of a small screen. The choice is kept for the tab in sessionStorage,
 * since links inside the toolkit carry no query string to hold it.
 */

/*
 * A phone is a touch screen whose short side is under 600px, in either
 * orientation; tablets and computers are not.
 */
export const onPhone =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches === true &&
  Math.min(window.screen.width, window.screen.height) < 600

const KEY = 'ifdm-toolkit-app-view'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// Kept in memory as well, so the button still works where storage is blocked.
let expanded = typeof window !== 'undefined' && read()

/** Put a phone's browser into the app view, or back onto the full site. */
export function setPhoneExpanded(on: boolean) {
  expanded = on
  try {
    if (on) window.sessionStorage.setItem(KEY, '1')
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  listeners.forEach((l) => l())
  // The header above the page has just come or gone, so the old scroll
  // position points somewhere else now.
  window.scrollTo(0, 0)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether a phone visitor has expanded the website into the app view. */
export function usePhoneExpanded(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => expanded,
    () => false,
  )
}

/** Whether the page should render as the app does. */
export function useAppView(): boolean {
  const phoneExpanded = usePhoneExpanded()
  return isNativeApp || phoneExpanded
}
