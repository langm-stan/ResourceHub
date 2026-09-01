import { useLocation } from 'react-router-dom'

/*
 * Framed mode: the toolkit inside an <iframe> on ifdm.stanford.edu, where the
 * host page already supplies the Stanford header, the site navigation, the
 * Resource Hub left rail, and the footer. Framed pages keep only the cardinal
 * banner and the content well.
 *
 * Turned on by ?frame=1 on any URL and off by ?frame=0. In-app links do not
 * carry query strings, so the choice is remembered for the tab in
 * sessionStorage; the iframe has its own storage, so a visitor's other tabs
 * on the toolkit are unaffected.
 *
 * Distinct from ?embed=1, which strips a single tool bare (no banner) for a
 * slide or a course page.
 */

const KEY = 'ifdm-toolkit-frame'

function storedFrame(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function storeFrame(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(KEY, '1')
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // Storage blocked (private mode, strict cookie settings): the flag then
    // lives only as long as the query string does.
  }
}

/** Whether the current page should render for the IFDM site's iframe. */
export function useFramed(): boolean {
  const { search } = useLocation()
  const param = new URLSearchParams(search).get('frame')
  if (param === '1') {
    storeFrame(true)
    return true
  }
  if (param === '0') {
    storeFrame(false)
    return false
  }
  return storedFrame()
}
