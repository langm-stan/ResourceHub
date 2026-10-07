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
const FROM_HOST_KEY = 'ifdm-toolkit-from-host'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/*
 * Inside another site's page (the iframe on ifdm.stanford.edu) nothing can
 * grow past the frame. The way out is to open the toolkit as a page of its
 * own, already in the app view, which is what ?app=1 on the address asks for.
 * The router keeps the query inside the hash, so that is where it is read.
 */
export const inIframe = (() => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    // Reading window.top can throw across origins, which is itself the answer.
    return true
  }
})()

/** The address of a toolkit page on its own, opening in the app view. */
export function standaloneAppUrl(pathname: string): string {
  return `${window.location.origin}${window.location.pathname}#${pathname}?app=1`
}

const askedFor = typeof window !== 'undefined' && /[?&]app=1(&|$)/.test(window.location.hash)

// Kept in memory as well, so the button still works where storage is blocked.
// Never inside an iframe: the host page owns the chrome there, whatever a
// tab's storage remembers from a visit to the toolkit on its own.
let expanded = typeof window !== 'undefined' && !inIframe && (askedFor || read())
if (askedFor && !inIframe) {
  try {
    window.sessionStorage.setItem(KEY, '1')
    window.sessionStorage.setItem(FROM_HOST_KEY, '1')
  } catch {
    // Storage blocked: the view lasts until the page is reloaded.
  }
}

/*
 * Whether this tab reached the app view by expanding out of the IFDM site's
 * iframe. Leaving the app view then means going back to that site, not on to
 * the toolkit's own full pages. Remembered for the tab, because the ?app=1
 * that says so is gone from the address after the first move between tools.
 */
export const cameFromHost = (() => {
  if (inIframe) return false
  if (askedFor) return true
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(FROM_HOST_KEY) === '1'
  } catch {
    return false
  }
})()

/** Where the toolkit sits on the IFDM site, for a tab with nothing to go back to. */
const HOST_PAGE = 'https://ifdm.stanford.edu/resourcehub/personal-finance-toolkit'

/*
 * Back to the page the toolkit was expanded from. The router numbers each
 * entry it adds to the tab's history from the one the toolkit loaded on
 * (history.state.idx), so the IFDM page is one step before that, however
 * many tools were opened since. A tab that opened straight onto the toolkit
 * has no such page behind it and goes to the IFDM site by address.
 */
export function exitToHost() {
  const idx = Number((window.history.state as { idx?: number } | null)?.idx ?? 0)
  if (window.history.length > idx + 1) window.history.go(-(idx + 1))
  else window.location.href = HOST_PAGE
}

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
