import { useState } from 'react'

/*
 * Whether the toolkit runner (the frame view's navigation strip, see
 * components/ToolkitRunner) is open. Remembered for the tab so a visitor
 * browsing tool to tool is not made to reopen it on every page.
 */

const OPEN_KEY = 'ifdm-toolkit-runner'

function storedOpen(): boolean {
  try {
    return window.sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function storeOpen(open: boolean) {
  try {
    if (open) window.sessionStorage.setItem(OPEN_KEY, '1')
    else window.sessionStorage.removeItem(OPEN_KEY)
  } catch {
    // Storage blocked: the runner simply starts closed on the next page.
  }
}


export function useToolkitRunner(): [boolean, () => void] {
  const [open, setOpen] = useState(storedOpen)
  const toggle = () => {
    setOpen((o) => {
      storeOpen(!o)
      return !o
    })
  }
  return [open, toggle]
}

