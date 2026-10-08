import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { downloadSvgAsPng, slugForFilename, type ExportStat } from './downloadPng'
import { textTone } from '../textTone'
import type { ChartTable } from './DataTable'
import styles from './ChartFrame.module.css'

export type { ExportStat, ChartTable }

export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartGeometry {
  width: number
  height: number
  margin: ChartMargin
  innerWidth: number
  innerHeight: number
  /**
   * HTML layer above the SVG for hover readouts. SVG foreignObject repaints
   * unreliably in WebKit (ghost tooltips trail the cursor), so tips portal here.
   */
  overlayEl: HTMLDivElement | null
  /** Too narrow for a key inside the plot (a phone): the key sits above it instead. */
  narrow: boolean
  /** A key tells the frame how much room it needs above the plot when narrow. */
  reserveLegend: (px: number) => void
  /**
   * Where the chart's numbers are written out as a table while a reader has
   * the table open, and null otherwise. ChartData portals its rows here.
   */
  tableEl: HTMLDivElement | null
  /** ChartData tells the frame it has a table to offer. */
  offerTable: (has: boolean) => void
}

const ChartContext = createContext<ChartGeometry | null>(null)

/** Access plot geometry from inside a ChartFrame. */
export function useChart(): ChartGeometry {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error('Chart primitives must be used inside a <ChartFrame>.')
  return ctx
}

/*
 * The heading a chart sits under: the nearest visible h1 to h4 before it,
 * looking back through earlier siblings and then up through each ancestor,
 * without leaving the tool (.toolkitScope, or main on a page without one).
 * The sidebar sits beside the tool and is full of headings that are not
 * this chart's. A chart with no heading of its own above it takes the
 * page's title, which is then its name. That way an expanded chart or a
 * downloaded PNG carries the name a reader sees, without every tool
 * repeating its headings as a prop.
 */
const HEADINGS = 'h1, h2, h3, h4'
const shown = (el: Element) => el.getClientRects().length > 0
const textOf = (el: Element | null | undefined) => el?.textContent?.trim() || undefined

function headingBefore(start: Element | null): string | undefined {
  if (!start) return undefined
  const boundary = start.closest('.toolkitScope') ?? start.closest('main') ?? document.body
  for (let node: Element | null = start; node && node !== boundary; node = node.parentElement) {
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
      if (sib.matches(HEADINGS) && shown(sib)) return textOf(sib)
      const inner = Array.from(sib.querySelectorAll(HEADINGS)).filter(shown)
      if (inner.length > 0) return textOf(inner[inner.length - 1])
    }
  }
  return textOf(document.querySelector('h1'))
}

interface ChartFrameProps {
  /** The chart's name, shown when expanded and on the PNG. Defaults to the heading it sits under. */
  title?: string
  ratio?: number
  height?: number
  /** Cap the ratio-derived height so full-width charts stay presentation-shaped. */
  maxHeight?: number
  margin?: Partial<ChartMargin>
  figure?: string
  caption?: ReactNode
  ariaLabel?: string
  /** Set false to hide the expand-to-fullscreen control. */
  expandable?: boolean
  /** Extra content (e.g. headline stats) shown above the chart in expanded view. */
  overlayHeader?: ReactNode
  /**
   * Headline stats as plain data. Shown above the chart in the expanded view
   * (when no custom overlayHeader is given) and drawn into the downloaded
   * PNG together with the caption, so the exported figure stands alone.
   */
  exportStats?: ExportStat[]
  /**
   * Opens the expanded view from outside the chart: each time this number
   * changes to a new value above zero, the chart opens as if its expand
   * button had been pressed.
   */
  expandSignal?: number
  children: ReactNode
}

const DEFAULT_MARGIN: ChartMargin = { top: 20, right: 24, bottom: 36, left: 64 }

/*
 * A phone, held either way: a narrow window, or a short one on a touch
 * screen. The same query is repeated in ChartFrame.module.css, where the
 * expanded view takes the whole screen; keep the two in step.
 */
const PHONE_QUERY = '(max-width: 640px), (max-height: 520px) and (pointer: coarse)'

function usePhoneScreen(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches === true,
  )
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY)
    if (!mq) return
    const onChange = () => setPhone(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

/*
 * The charts are drawn wide and short, for a laptop or a projector. At a
 * phone's width that shape leaves a strip too shallow to read, so a narrow
 * chart is never flatter than this.
 */
const NARROW_WIDTH = 480
const NARROW_MIN_RATIO = 0.72

/** The measured, responsive SVG canvas. Provides plot geometry to chart marks. */
function MeasuredCanvas({
  ratio = 0.5,
  height,
  maxHeight,
  margin: marginOverride,
  ariaLabel,
  fill = false,
  tableEl = null,
  offerTable = noTable,
  children,
}: Pick<ChartFrameProps, 'ratio' | 'height' | 'maxHeight' | 'margin' | 'ariaLabel' | 'children'> & {
  /** Take the height of the box the canvas sits in, instead of deriving one from the width. */
  fill?: boolean
  tableEl?: HTMLDivElement | null
  offerTable?: (has: boolean) => void
}) {
  const [ref, size] = useResizeObserver<HTMLDivElement>()
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null)
  const [legendRoom, setLegendRoom] = useState(0)
  const base = { ...DEFAULT_MARGIN, ...marginOverride }

  const width = size.width || 720
  const narrow = width < NARROW_WIDTH
  // Room for the key comes off the top; the plot keeps its shape below it.
  const keyRoom = narrow ? legendRoom : 0
  const margin = { ...base, top: base.top + keyRoom }
  const shape = width < NARROW_WIDTH ? Math.max(ratio, NARROW_MIN_RATIO) : ratio
  const h = fill
    ? Math.floor(size.height)
    : (height ?? Math.min(Math.round(width * shape), maxHeight ?? Number.POSITIVE_INFINITY)) + keyRoom
  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, h - margin.top - margin.bottom)
  const geometry: ChartGeometry = { width, height: h, margin, innerWidth,
    innerHeight,
    overlayEl,
    narrow,
    reserveLegend: setLegendRoom,
    tableEl,
    offerTable,
  }

  return (
    <div ref={ref} className={fill ? `${styles.canvas} ${styles.canvasFill}` : styles.canvas}>
      {size.width > 0 && h > 0 && (
        <svg
          width={width}
          height={h}
          viewBox={`0 0 ${width} ${h}`}
          role="img"
          aria-label={ariaLabel}
          className={styles.svg}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            <ChartContext.Provider value={geometry}>{children}</ChartContext.Provider>
          </g>
        </svg>
      )}
      <div ref={setOverlayEl} className={styles.hoverLayer} aria-hidden="true" />
    </div>
  )
}

/* The expanded copy of a chart leaves the table to the copy on the page. */
const noTable = () => {}

export function ChartFrame({
  title,
  ratio = 0.5,
  height,
  maxHeight,
  margin,
  figure,
  caption,
  ariaLabel,
  expandable = true,
  overlayHeader,
  exportStats,
  expandSignal,
  children,
}: ChartFrameProps) {
  const [expanded, setExpanded] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [offered, setOffered] = useState(false)
  const [tableEl, setTableEl] = useState<HTMLDivElement | null>(null)
  const tableId = useId()
  const hasTable = offered
  const phone = usePhoneScreen()
  const shellRef = useRef<HTMLDivElement>(null)
  const nameOf = () => title ?? headingBefore(shellRef.current?.closest('figure') ?? null)
  const [shownTitle, setShownTitle] = useState<string | undefined>()
  const expand = () => {
    setShownTitle(nameOf())
    setExpanded(true)
  }

  const toggleTable = () => {
    setShownTitle(nameOf())
    setTableOpen((open) => !open)
  }

  useEffect(() => {
    if (expandSignal) expand()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal])

  const download = () => {
    const svg = shellRef.current?.querySelector('svg')
    if (!svg) return
    // Canvas cannot resolve var(--c-...) colors, so resolve each stat color
    // against the live document before handing them to the rasterizer.
    const probe = document.createElement('span')
    shellRef.current?.appendChild(probe)
    const stats = (exportStats ?? []).map((s) => {
      if (!s.color) return s
      probe.style.color = textTone(s.color)
      return { ...s, color: window.getComputedStyle(probe).color }
    })
    probe.remove()
    // Join the figcaption's pieces ("Figure 1." span + caption text) with a
    // space; plain textContent would run them together.
    const captionEl = shellRef.current?.closest('figure')?.querySelector('figcaption')
    const captionText = captionEl
      ? Array.from(captionEl.childNodes)
          .map((n) => n.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
      : undefined
    const name = nameOf()
    downloadSvgAsPng(svg, slugForFilename(name ?? ariaLabel), {
      title: name,
      stats,
      caption: captionText,
    })
  }

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [expanded])

  const captionNode = (figure || caption) && (
    <figcaption className={styles.caption}>
      {figure && <span className={styles.figure}>{figure}</span>}
      {caption}
    </figcaption>
  )

  return (
    <figure className={styles.frame}>
      <div ref={shellRef} className={styles.canvasShell}>
        <MeasuredCanvas
          ratio={ratio}
          height={height}
          maxHeight={maxHeight}
          margin={margin}
          ariaLabel={ariaLabel}
          tableEl={tableOpen ? tableEl : null}
          offerTable={setOffered}
        >
          {children}
        </MeasuredCanvas>
        {/* On a touch screen there is no hover to reveal these, so they sit
            in a row of their own above the chart (see the stylesheet). */}
        <div className={styles.tools}>
        {hasTable && (
          <button
            type="button"
            className={`${styles.expandBtn} ${styles.tableBtn} ${tableOpen ? styles.tableBtnOn : ''}`}
            onClick={toggleTable}
            aria-expanded={tableOpen}
            aria-controls={tableId}
            aria-label="Show this chart's numbers as a table"
            title={tableOpen ? 'Hide the table' : 'Show the numbers as a table'}
          >
            <TableIcon />
          </button>
        )}
        <button
          type="button"
          className={`${styles.expandBtn} ${styles.downloadBtn}`}
          onClick={download}
          aria-label="Download this chart as a PNG image"
          title="Download PNG for slides"
        >
          <DownloadIcon />
        </button>
        {expandable && (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={expand}
            aria-label="Expand chart to full screen"
            title="Expand chart"
          >
            <ExpandIcon />
          </button>
        )}
        </div>
      </div>
      {captionNode}
      {/* Always in the document, so the button's aria-controls has a target. */}
      {hasTable && (
        <div
          id={tableId}
          ref={setTableEl}
          className={styles.tableWrap}
          hidden={!tableOpen}
          role="region"
          aria-label={`${shownTitle ?? 'Chart'}, as a table`}
          tabIndex={0}
        />
      )}

      {expanded &&
        createPortal(
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={shownTitle ?? 'Expanded chart'}
            onClick={() => setExpanded(false)}
          >
            <div className={styles.overlayPanel} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setExpanded(false)}
                aria-label="Close expanded chart"
                title="Close (Esc)"
              >
                <CloseIcon />
              </button>
              {shownTitle && <h2 className={styles.overlayTitle}>{shownTitle}</h2>}
              {(overlayHeader || (exportStats && exportStats.length > 0)) && (
                <div className={styles.overlayHeader}>
                  {overlayHeader ?? (
                    <div className={styles.exportStats}>
                      {exportStats!.map((s) => (
                        <div key={s.label} className={styles.exportStat}>
                          <span className={styles.exportStatLabel}>{s.label}</span>
                          <span
                            className={`${styles.exportStatValue} tnum`}
                            style={s.color ? { color: textTone(s.color) } : undefined}
                          >
                            {s.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className={styles.overlayCanvas}>
                {/* Fill the wide panel, but never taller than the viewport
                    leaves room for (header, caption, padding). On a phone
                    the panel is the screen, and the chart takes all of it
                    that the words around it leave. */}
                <MeasuredCanvas
                  fill={phone}
                  ratio={0.46}
                  maxHeight={Math.max(360, Math.round(window.innerHeight * 0.66))}
                  margin={margin}
                  ariaLabel={ariaLabel}
                >
                  {children}
                </MeasuredCanvas>
              </div>
              {captionNode}
            </div>
          </div>,
          /* Inside whatever fills the screen. In fullscreen the browser draws
             only that element and what it contains, so an overlay on the body
             would open unseen. */
          document.fullscreenElement ?? document.body,
        )}
    </figure>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
