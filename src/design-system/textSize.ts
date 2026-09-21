/*
 * The page's text size, held outside React.
 *
 * Two things move it and they are never on screen together: the control in
 * the bar, which unmounts and remounts whenever the screen fills or empties,
 * and the fill itself, which steps the size up because a tool being shown to
 * a room is read from the back of it. A remounting component cannot remember
 * what the size was before, so the size does not live in one.
 *
 * Scaling <main> rather than the font sizes enlarges the type without the
 * reflow that changing font sizes alone would cause, and keeps charts and
 * controls in proportion with it. The Stanford header and footer are left
 * alone.
 */

/** Percentages the page can be shown at, smallest first. */
export const SIZES = [75, 90, 100, 125, 150, 175, 200] as const
export type TextSize = (typeof SIZES)[number]

export const DEFAULT_SIZE: TextSize = 100
/*
 * What a filled screen steps up to, when it is not already larger. A tool on
 * a screen is being read by a room, and by people who would rather not be
 * squinting; the sizes above this one are there for when that is still not
 * enough.
 */
export const FULL_SCREEN_SIZE: TextSize = 150

const KEY = 'ifdm-present'

function apply(size: number) {
  if (typeof document === 'undefined') return
  if (size === DEFAULT_SIZE) delete document.documentElement.dataset.present
  else document.documentElement.dataset.present = String(size)
}

function stored(): TextSize {
  if (typeof localStorage === 'undefined') return DEFAULT_SIZE
  try {
    const raw = Number(localStorage.getItem(KEY))
    if ((SIZES as readonly number[]).includes(raw)) return raw as TextSize
  } catch {
    // Storage blocked: the normal size.
  }
  return DEFAULT_SIZE
}

let current: TextSize = stored()
apply(current)

const listeners = new Set<() => void>()

export function getTextSize(): TextSize {
  return current
}

export function setTextSize(size: TextSize) {
  if (size === current) return
  current = size
  apply(size)
  try {
    localStorage.setItem(KEY, String(size))
  } catch {
    // ignore storage failures
  }
  listeners.forEach((l) => l())
}

export function subscribeTextSize(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
