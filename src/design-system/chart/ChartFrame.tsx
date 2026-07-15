import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { downloadSvgAsPng, slugForFilename, type ExportStat } from './downloadPng'
import styles from './ChartFrame.module.css'

export type { ExportStat }

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
}

const ChartContext = createContext<ChartGeometry | null>(null)

/** Access plot geometry from inside a ChartFrame. */
export function useChart(): ChartGeometry {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error('Chart primitives must be used inside a <ChartFrame>.')
  return ctx
}

interface ChartFrameProps {
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
  children: ReactNode
}

const DEFAULT_MARGIN: ChartMargin = { top: 20, right: 24, bottom: 36, left: 64 }

/** The measured, responsive SVG canvas. Provides plot geometry to chart marks. */
function MeasuredCanvas({
  ratio = 0.5,
  height,
  maxHeight,
  margin: marginOverride,
  ariaLabel,
  children,
}: Pick<ChartFrameProps, 'ratio' | 'height' | 'maxHeight' | 'margin' | 'ariaLabel' | 'children'>) {
  const [ref, size] = useResizeObserver<HTMLDivElement>()
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null)
  const margin = { ...DEFAULT_MARGIN, ...marginOverride }

  const width = size.width || 720
  const h = height ?? Math.min(Math.round(width * ratio), maxHeight ?? Number.POSITIVE_INFINITY)
  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, h - margin.top - margin.bottom)
  const geometry: ChartGeometry = { width, height: h, margin, innerWidth, innerHeight, overlayEl }

  return (
    <div ref={ref} className={styles.canvas}>
      {size.width > 0 && (
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

export function ChartFrame({
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
  children,
}: ChartFrameProps) {
  const [expanded, setExpanded] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)

  const download = () => {
    const svg = shellRef.current?.querySelector('svg')
    if (!svg) return
    // Canvas cannot resolve var(--c-...) colors, so resolve each stat color
    // against the live document before handing them to the rasterizer.
    const probe = document.createElement('span')
    shellRef.current?.appendChild(probe)
    const stats = (exportStats ?? []).map((s) => {
      if (!s.color) return s
      probe.style.color = s.color
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
    downloadSvgAsPng(svg, slugForFilename(ariaLabel), { stats, caption: captionText })
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
        <MeasuredCanvas ratio={ratio} height={height} maxHeight={maxHeight} margin={margin} ariaLabel={ariaLabel}>
          {children}
        </MeasuredCanvas>
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
            onClick={() => setExpanded(true)}
            aria-label="Expand chart to full screen"
            title="Expand chart"
          >
            <ExpandIcon />
          </button>
        )}
      </div>
      {captionNode}

      {expanded &&
        createPortal(
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded chart"
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
              {(overlayHeader || (exportStats && exportStats.length > 0)) && (
                <div className={styles.overlayHeader}>
                  {overlayHeader ?? (
                    <div className={styles.exportStats}>
                      {exportStats!.map((s) => (
                        <div key={s.label} className={styles.exportStat}>
                          <span className={styles.exportStatLabel}>{s.label}</span>
                          <span
                            className={`${styles.exportStatValue} tnum`}
                            style={s.color ? { color: s.color } : undefined}
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
                    leaves room for (header, caption, padding). */}
                <MeasuredCanvas
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
          document.body,
        )}
    </figure>
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
