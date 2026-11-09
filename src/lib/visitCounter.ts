/*
 * Visit counting with GoatCounter (goatcounter.com): free, no cookies, no
 * personal data. Only the site owner sees the numbers, on the GoatCounter
 * dashboard.
 *
 * The site routes on the hash (#/taxes), which GoatCounter ignores, so the
 * script is told not to count on load and each page change is reported here
 * with its own path instead.
 *
 * Nothing is counted on the dev server or in the iOS app.
 */
import { isNativeApp } from './nativeApp'

/** The site code chosen at signup (the "xxx" in xxx.goatcounter.com). Empty turns counting off. */
const GOATCOUNTER_CODE: string = 'ifdm-toolkit'

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string }) => void; no_onload?: boolean }
  }
}

const enabled =
  GOATCOUNTER_CODE !== '' &&
  !isNativeApp &&
  typeof window !== 'undefined' &&
  !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)

let pending: string | null = null

if (enabled) {
  window.goatcounter = { no_onload: true }
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://gc.zgo.at/count.js'
  script.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`
  script.onload = () => {
    if (pending) countPage(pending)
  }
  document.head.appendChild(script)
}

/** Report one page view for a route path such as "/taxes". */
export function countPage(path: string) {
  if (!enabled) return
  const count = window.goatcounter?.count
  if (!count) {
    pending = path // script still loading; send once it arrives
    return
  }
  pending = null
  count({ path, title: document.title })
}
