import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import styles from './FullscreenProvider.module.css'

/*
 * Filling the screen belongs to the whole toolkit, not to one tool.
 *
 * The element this fills is the app's outermost wrapper, which the router
 * never unmounts, so a visitor who fills the screen on the catalog and then
 * opens a tool stays filled the whole way through. An element owned by a
 * single tool page would be destroyed the moment the reader moved on.
 *
 * The browser only grants fullscreen during a click, which is the other
 * reason this lives here: a link can call enter() from its own handler
 * before the router moves, rather than a tool page asking for it after the
 * fact, once the gesture has expired.
 *
 * A page inside an iframe only reaches real fullscreen if the host page
 * allows it. When the request is refused, the fallback fills the frame,
 * which is as far as anything inside an iframe can reach.
 */

interface FullscreenApi {
  /** True whether the screen is really filled or only the frame is. */
  isFull: boolean
  /** False when the host page forbids it, so a button can name itself honestly. */
  canFullscreen: boolean
  enter: () => void
  exit: () => void
  toggle: () => void
}

const OFF: FullscreenApi = {
  isFull: false,
  canFullscreen: false,
  enter: () => {},
  exit: () => {},
  toggle: () => {},
}

const FullscreenContext = createContext<FullscreenApi>(OFF)

export function useFullscreen() {
  return useContext(FullscreenContext)
}

export function FullscreenProvider({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  /** The browser granted fullscreen. */
  const [real, setReal] = useState(false)
  /** The browser refused, and the frame is filled instead. */
  const [filled, setFilled] = useState(false)
  const isFull = real || filled
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled
  const { pathname } = useLocation()

  // The browser can leave fullscreen without us (Escape, the system control),
  // so the state follows the document rather than its own memory.
  useEffect(() => {
    const sync = () => {
      const granted = document.fullscreenElement === ref.current
      setReal(granted)
      // A late grant supersedes the filled frame, so the two never stack.
      if (granted) setFilled(false)
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Escape also closes the fallback, which the browser knows nothing about.
  useEffect(() => {
    if (!filled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilled(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filled])

  // Filled, this element scrolls rather than the window, so each new page has
  // to be scrolled back to its top by hand.
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 })
  }, [pathname])

  const enter = useCallback(() => {
    const el = ref.current
    if (!el || document.fullscreenElement === el) return
    /*
     * Called straight out of a click, so the browser still sees the gesture.
     *
     * A host page that forbids fullscreen answers in one of two ways: it
     * rejects, or it drops the request and leaves the promise pending for
     * good. The timer covers the second, which is otherwise a button that
     * does nothing at all. Whichever arrives first wins, and a grant that
     * lands late clears the filled frame in the fullscreenchange handler.
     */
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) setFilled(true)
    }, 300)
    const done = () => {
      settled = true
      window.clearTimeout(timer)
    }
    el.requestFullscreen().then(done, () => {
      done()
      setFilled(true)
    })
  }, [])

  const exit = useCallback(() => {
    setFilled(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }, [])

  const api = useMemo<FullscreenApi>(
    () => ({
      isFull,
      canFullscreen,
      enter,
      exit,
      toggle: () => (isFull ? exit() : enter()),
    }),
    [isFull, canFullscreen, enter, exit],
  )

  return (
    <FullscreenContext.Provider value={api}>
      <div ref={ref} className={`${styles.shell} ${filled ? styles.filled : ''} ${className}`}>
        {children}
      </div>
    </FullscreenContext.Provider>
  )
}
