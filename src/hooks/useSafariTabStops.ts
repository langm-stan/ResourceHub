import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/*
 * Safari on macOS ships with keyboard navigation off, and in that state it
 * tabs only to text fields and pop-up menus: links, buttons, checkboxes and
 * radio buttons are all skipped. Giving an element an explicit tabindex puts
 * it back in the sequence, so this walks the page and marks every control
 * that is already focusable by nature but carries no tabindex of its own.
 *
 * Writing tabindex="0" onto an element that is focusable anyway changes
 * nothing in Chrome or Firefox, and nothing about the order: the elements
 * keep their document position. Anything that deliberately sets its own
 * tabindex (the -1 on <main>, for instance) is left alone, as is anything
 * disabled, any hidden input, and any anchor without an href, since none of
 * those should take focus.
 */

const SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
]
  .map((s) => `${s}:not([tabindex]):not([disabled])`)
  .join(',')

function markTabStops() {
  for (const el of document.querySelectorAll(SELECTOR)) {
    el.setAttribute('tabindex', '0')
  }
}

export function useSafariTabStops() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    markTabStops()

    // Tool pages build controls as the visitor works, so new ones are marked
    // as they arrive. The observer watches structure only, never attributes,
    // so writing tabindex cannot retrigger it; a frame's worth of changes is
    // batched into one pass.
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        markTabStops()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname, search])
}
