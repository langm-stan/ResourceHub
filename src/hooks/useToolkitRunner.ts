import { useState } from 'react'

/*
 * Whether the toolkit runner (the frame view's navigation strip, see
 * components/ToolkitRunner) is open. It starts open, so the course is in
 * view the moment a tool page loads; a visitor who hides it stays hidden
 * for the rest of the tab, and one who reopens it keeps it open.
 */

const OPEN_KEY = 'ifdm-toolkit-runner'

function storedOpen(): boolean {
  try {
    return window.sessionStorage.getItem(OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

function storeOpen(open: boolean) {
  try {
    window.sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Storage blocked: the runner simply starts open on the next page.
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

