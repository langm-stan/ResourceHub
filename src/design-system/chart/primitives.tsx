import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { area as d3area, line as d3line, curveMonotoneX } from 'd3-shape'
import type { ScaleLinear } from 'd3-scale'
import { useChart } from './ChartFrame'
import styles from './primitives.module.css'

type Scale = ScaleLinear<number, number>

/* Gridlines — horizontal only (journal convention). */
export function Gridlines({ y, ticks = 5 }: { y: Scale; ticks?: number }) {
  const { innerWidth } = useChart()
  const values = y.ticks(ticks)
  return (
    <g aria-hidden="true">
      {values.map((v) => (
        <line key={v} x1={0} x2={innerWidth} y1={y(v)} y2={y(v)} className={styles.grid} />
      ))}
    </g>
  )
}

/* Axes — hand-rolled, sparse ticks, no top/right spines. */
export function AxisLeft({
  y,
  ticks = 5,
  format,
}: {
  y: Scale
  ticks?: number
  format: (v: number) => string
}) {
  const values = y.ticks(ticks)
  return (
    <g className={styles.axis} aria-hidden="true">
      {values.map((v) => (
        <text key={v} x={-12} y={y(v)} dy="0.32em" textAnchor="end" className={styles.tickLabel}>
          {format(v)}
        </text>
      ))}
    </g>
  )
}

export function AxisBottom({
  x,
  ticks = 6,
  format,
}: {
  x: Scale
  ticks?: number
  format: (v: number) => string
}) {
  const { innerHeight } = useChart()
  const values = x.ticks(ticks)
  return (
    <g className={styles.axis} aria-hidden="true">
      <line x1={0} x2={x.range()[1]} y1={innerHeight} y2={innerHeight} className={styles.axisLine} />
      {values.map((v) => (
        <text key={v} x={x(v)} y={innerHeight + 20} textAnchor="middle" className={styles.tickLabel}>
          {format(v)}
        </text>
      ))}
    </g>
  )
}

interface SeriesAccessors<T> {
  data: T[]
  x: (d: T) => number
  xScale: Scale
  yScale: Scale
}

export function LineSeries<T>({
  data,
  x,
  y,
  xScale,
  yScale,
  stroke,
  width = 2,
  dashed = false,
  draw = false,
}: SeriesAccessors<T> & {
  y: (d: T) => number
  stroke: string
  width?: number
  dashed?: boolean
  draw?: boolean
}) {
  const path = useMemo(() => {
    const gen = d3line<T>()
      .x((d) => xScale(x(d)))
      .y((d) => yScale(y(d)))
      .curve(curveMonotoneX)
    return gen(data) ?? ''
  }, [data, x, y, xScale, yScale])

  return (
    <path
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '5 5' : undefined}
      className={draw && !dashed ? styles.drawIn : undefined}
      pathLength={draw ? 1 : undefined}
    />
  )
}

export function AreaSeries<T>({
  data,
  x,
  y0,
  y1,
  xScale,
  yScale,
  fill,
  stroke,
}: SeriesAccessors<T> & {
  y0: (d: T) => number
  y1: (d: T) => number
  fill: string
  stroke?: string
}) {
  const { path, topLine } = useMemo(() => {
    const gen = d3area<T>()
      .x((d) => xScale(x(d)))
      .y0((d) => yScale(y0(d)))
      .y1((d) => yScale(y1(d)))
      .curve(curveMonotoneX)
    const line = d3line<T>()
      .x((d) => xScale(x(d)))
      .y((d) => yScale(y1(d)))
      .curve(curveMonotoneX)
    return { path: gen(data) ?? '', topLine: line(data) ?? '' }
  }, [data, x, y0, y1, xScale, yScale])

  return (
    <g>
      <path d={path} fill={fill} />
      {stroke && <path d={topLine} fill="none" stroke={stroke} strokeWidth={1.25} />}
    </g>
  )
}

export function Annotation({
  x,
  y,
  dx = 0,
  dy = -28,
  label,
  align = 'middle',
  tone = 'ink',
}: {
  x: number
  y: number
  dx?: number
  dy?: number
  label: string
  align?: 'start' | 'middle' | 'end'
  tone?: 'ink' | 'mark' | 'accent'
}) {
  const toneClass =
    tone === 'mark' ? styles.annMark : tone === 'accent' ? styles.annAccent : styles.annInk
  return (
    <g className={`${styles.annotation} ${toneClass}`}>
      <line x1={x} y1={y} x2={x + dx} y2={y + dy} className={styles.leader} />
      <circle cx={x} cy={y} r={3} className={styles.annDot} />
      <text x={x + dx} y={y + dy - 6} textAnchor={align} className={styles.annLabel}>
        {label}
      </text>
    </g>
  )
}

export function VMarker({
  x,
  xScale,
  label,
}: {
  x: number
  xScale: Scale
  label?: string
}) {
  const { innerHeight } = useChart()
  const px = xScale(x)
  return (
    <g className={styles.marker}>
      <line x1={px} x2={px} y1={0} y2={innerHeight} className={styles.markerLine} />
      {label && (
        <text x={px + 5} y={12} className={styles.markerLabel}>
          {label}
        </text>
      )}
    </g>
  )
}

export interface HoverTipRow {
  label: string
  value: string
  /** Swatch color; omit for a plain value row. */
  color?: string
}

/**
 * The floating readout box shown while hovering a chart. Positioned by the
 * x pixel of the hovered point; flips to the left near the right edge.
 * Rendered as HTML portaled above the SVG — foreignObject repaints
 * unreliably in WebKit, leaving ghost copies that trail the cursor.
 */
export function HoverTip({ px, title, rows }: { px: number; title: string; rows: HoverTipRow[] }) {
  const { innerWidth, margin, overlayEl } = useChart()
  if (!overlayEl) return null
  const W = 224
  const flip = px > innerWidth - W - 20
  const style = flip
    ? { left: margin.left + px - 14, transform: 'translateX(-100%)' }
    : { left: margin.left + px + 14 }
  return createPortal(
    <div className={styles.tip} style={{ position: 'absolute', top: margin.top + 6, ...style }}>
      <div className={styles.tipTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.label} className={styles.tipRow}>
          {r.color && <span className={styles.tipSwatch} style={{ background: r.color }} />}
          <span className={styles.tipLabel}>{r.label}</span>
          <span className={`${styles.tipValue} tnum`}>{r.value}</span>
        </div>
      ))}
    </div>,
    overlayEl,
  )
}

export interface HoverSeries<T> {
  label: string
  /** Swatch + marker-dot color; omit for a value-only tooltip row. */
  color?: string
  /** The value shown in the tooltip. */
  y: (d: T) => number
  /** Where the marker dot sits when it differs from the value (stacked areas). */
  dotY?: (d: T) => number
  /** Set false to show the tooltip row without a dot on the chart. */
  dot?: boolean
  format: (v: number) => string
}

/**
 * Hover interaction for x-continuous charts: a transparent capture surface,
 * a crosshair at the nearest data point, a marker dot per series, and a
 * HoverTip listing each series' value. Render it LAST inside the frame so
 * the capture surface sits above the marks.
 */
export function HoverProbe<T>({
  data,
  x,
  xScale,
  yScale,
  series,
  xLabel,
}: {
  data: T[]
  x: (d: T) => number
  xScale: Scale
  yScale: Scale
  series: HoverSeries<T>[]
  /** Format the hovered x value for the tooltip title, e.g. "Age 45". */
  xLabel: (v: number) => string
}) {
  const { innerWidth, innerHeight } = useChart()
  const [idx, setIdx] = useState<number | null>(null)
  const d = idx == null ? null : (data[idx] ?? null)

  const move = (e: React.PointerEvent<SVGRectElement>) => {
    if (data.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const vx = xScale.invert(e.clientX - rect.left)
    let best = 0
    for (let i = 1; i < data.length; i++) {
      if (Math.abs(x(data[i]) - vx) < Math.abs(x(data[best]) - vx)) best = i
    }
    setIdx(best)
  }

  const px = d ? xScale(x(d)) : 0
  const visible = d
    ? series
        .map((s) => ({ ...s, value: s.y(d), dotValue: (s.dotY ?? s.y)(d) }))
        .filter((s) => Number.isFinite(s.value))
    : []

  return (
    <>
      {d && (
        <g pointerEvents="none" aria-hidden="true">
          <line x1={px} x2={px} y1={0} y2={innerHeight} className={styles.probeLine} />
          {visible
            .filter((s) => s.color && s.dot !== false && Number.isFinite(s.dotValue))
            .map((s) => (
              <circle
                key={s.label}
                cx={px}
                cy={yScale(s.dotValue)}
                r={4}
                fill="var(--surface)"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
        </g>
      )}
      {d && (
        <HoverTip
          px={px}
          title={xLabel(x(d))}
          rows={visible.map((s) => ({ label: s.label, value: s.format(s.value), color: s.color }))}
        />
      )}
      <rect
        x={0}
        y={0}
        width={innerWidth}
        height={innerHeight}
        fill="transparent"
        onPointerMove={move}
        onPointerLeave={() => setIdx(null)}
      />
    </>
  )
}

export function EndLabel({
  x,
  y,
  text,
  color,
  textDy = 0,
}: {
  x: number
  y: number
  text: string
  color: string
  /** Vertical offset for the text only; the dot stays on the series. */
  textDy?: number
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.5} fill={color} />
      <text x={x + 8} y={y + textDy} dy="0.32em" className={styles.endLabel} fill={color}>
        {text}
      </text>
    </g>
  )
}
