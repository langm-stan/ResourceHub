import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { PresentationToggle } from '../design-system'
import styles from './ToolStage.module.css'

/*
 * The frame a tool sits in, with its size control and a way to fill the
 * screen. Neither navigates, which matters: the toolkit runs inside an iframe
 * on ifdm.stanford.edu, where a visitor sees the Stanford address, and any
 * new tab would replace that with the address the files are actually served
 * from.
 *
 * Filling the screen is tried with the Fullscreen API, which escapes the
 * iframe when the host page permits it. A host that does not permit it
 * refuses the request, so the fallback fills the frame instead, which is as
 * far as anything inside an iframe can reach. The controls travel with the
 * tool either way.
 */

export function ToolStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  /** True when the browser refused real fullscreen and the frame is filled instead. */
  const [inFrameOnly, setInFrameOnly] = useState(false)

  // The browser can leave fullscreen without us (Escape, the system control),
  // so the button follows the document rather than its own memory.
  useEffect(() => {
    const sync = () => {
      const isFull = document.fullscreenElement === ref.current
      setFull(isFull)
      if (!isFull) setInFrameOnly(false)
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Escape also closes the fallback, which the browser knows nothing about.
  useEffect(() => {
    if (!inFrameOnly) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInFrameOnly(false)
        setFull(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [inFrameOnly])

  const toggle = async () => {
    const el = ref.current
    if (!el) return
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      setInFrameOnly(false)
      setFull(false)
      return
    }
    try {
      await el.requestFullscreen()
    } catch {
      setInFrameOnly(true)
      setFull(true)
    }
  }

  return (
    <div
      ref={ref}
      className={`${styles.stage} ${full ? styles.full : ''} ${inFrameOnly ? styles.inFrame : ''}`}
    >
      <div className={styles.bar}>
        <PresentationToggle />
        <button type="button" onClick={() => void toggle()} className={styles.expand}>
          {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {full ? 'Leave full screen' : 'Full screen'}
        </button>
      </div>
      <div className="toolkitScope">{children}</div>
    </div>
  )
}
