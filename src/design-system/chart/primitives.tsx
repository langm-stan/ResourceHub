import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { area as d3area, line as d3line, curveMonotoneX } from 'd3-shape'
import type { ScaleLinear } from 'd3-scale'
import { useChart } from './ChartFrame'
import { DataTable } from './DataTable'
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
  const { innerHeight, innerWidth, margin } = useChart()
  // On a narrow chart the labels run into each other ("8y10y12y"). Drop
  // every other tick until the widest label has room; 7px a character is
  // close enough at the axis type size.
  let values = x.ticks(ticks)
  const room = Math.max(...values.map((v) => format(v).length), 1) * 7 + 10
  while (values.length > 2 && Math.abs(x(values[1]) - x(values[0])) < room) {
    values = values.filter((_, i) => i % 2 === 0)
  }
  return (
    <g className={styles.axis} aria-hidden="true">
      <line x1={0} x2={x.range()[1]} y1={innerHeight} y2={innerHeight} className={styles.axisLine} />
      {values.map((v) => (
        <text
          key={v}
          // A long last label ("200 bets") is centred on the plot's edge and
          // would run off the chart; it stops at the edge instead.
          x={Math.min(x(v), innerWidth + margin.right - (format(v).length * 7) / 2 - 2)}
          y={innerHeight + 20}
          textAnchor="middle"
          className={styles.tickLabel}
        >
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
  // Keep the label on the chart. On a phone-width plot a long note centred
  // near either side would be cut off, so it slides in just far enough.
  const { innerWidth, margin } = useChart()
  const w = label.length * 6.8
  const before = align === 'middle' ? w / 2 : align === 'end' ? w : 0
  const lo = -margin.left + 4 + before
  const hi = innerWidth + margin.right - 4 - (w - before)
  const lx = hi < lo ? x + dx : Math.max(lo, Math.min(hi, x + dx))
  const toneClass =
    tone === 'mark' ? styles.annMark : tone === 'accent' ? styles.annAccent : styles.annInk
  return (
    <g className={`${styles.annotation} ${toneClass}`}>
      <line x1={x} y1={y} x2={x + dx} y2={y + dy} className={styles.leader} />
      <circle cx={x} cy={y} r={3} className={styles.annDot} />
      <text x={lx} y={y + dy - 6} textAnchor={align} className={styles.annLabel}>
        {label}
      </text>
    </g>
  )
}

/*
 * A key for stacked bands: a swatch and a name per band, drawn in the plot.
 *
 * Bands do not carry their own labels the way a line can, and a leader line
 * into each one crowds the very area it is pointing at. A key sits in the
 * empty corner instead and says the same thing once.
 */
export function Legend({
  items,
  x = 0,
  y = 0,
  gap = 19,
}: {
  items: { label: string; fill: string; stroke?: string }[]
  x?: number
  y?: number
  gap?: number
}) {
  const { narrow, reserveLegend, margin } = useChart()
  // A phone-width plot has no empty corner to spare, so the key moves to a
  // strip of its own above the plot, which the frame makes room for.
  const rows = items.length
  useEffect(() => {
    reserveLegend(rows * gap + 10)
    return () => reserveLegend(0)
  }, [reserveLegend, rows, gap])
  const origin = narrow ? `translate(${14 - margin.left}, ${14 - margin.top})` : `translate(${x}, ${y})`
  return (
    <g transform={origin}>
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(0, ${i * gap})`}>
          <rect
            x={0}
            y={-6}
            width={13}
            height={12}
            fill={it.fill}
            stroke={it.stroke ?? 'none'}
            className={styles.legendSwatch}
          />
          <text x={19} y={0} className={styles.legendLabel}>
            {it.label}
          </text>
        </g>
      ))}
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
  const { innerHeight, innerWidth, margin } = useChart()
  const px = xScale(x)
  const fits = px + 5 + (label?.length ?? 0) * 6.8 <= innerWidth + margin.right - 2
  return (
    <g className={styles.marker}>
      <line x1={px} x2={px} y1={0} y2={innerHeight} className={styles.markerLine} />
      {label && (
        <text
          // Flip to the left of the line when the label would run off the right edge.
          x={fits ? px + 5 : px - 5}
          y={12}
          textAnchor={fits ? 'start' : 'end'}
          className={styles.markerLabel}
        >
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
  const { width, innerWidth, margin, overlayEl } = useChart()
  if (!overlayEl) return null
  const W = 224
  /* Right of the point if it fits, left if that fits, and otherwise as close
     to the point as the chart's own edges allow. A narrow chart has room on
     neither side, and a tip flipped past the left edge lands on whatever
     sits beside the chart. */
  const fitsRight = px <= innerWidth - W - 20
  const fitsLeft = margin.left + px - 14 - W >= 0
  const style = fitsRight
    ? { left: margin.left + px + 14 }
    : fitsLeft
      ? { left: margin.left + px - 14, transform: 'translateX(-100%)' }
      : { left: Math.max(0, Math.min(width - W, margin.left + px - W / 2)) }
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
  xName,
}: {
  data: T[]
  x: (d: T) => number
  xScale: Scale
  yScale: Scale
  series: HoverSeries<T>[]
  /** Format the hovered x value for the tooltip title, e.g. "Age 45". */
  xLabel: (v: number) => string
  /** What the x values are, as the heading of the table's first column, e.g. "Age". */
  xName: string
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
      {/* Every point and its wording is already here for the hover readout,
          so the same rows serve a reader who asks for the chart as a table. */}
      <ChartData
        columns={[xName, ...series.map((s) => s.label)]}
        rows={() =>
          data
            .map((p) => [
              xLabel(x(p)),
              ...series.map((s) => {
                const v = s.y(p)
                return Number.isFinite(v) ? s.format(v) : ''
              }),
            ])
            // A series finer than its labels (weekly points named by year)
            // would repeat a heading; the last row of each run stands for it.
            .filter((row, i, all) => row[0] !== all[i + 1]?.[0])
        }
      />
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

/**
 * The chart's numbers for a reader who cannot use the picture. Placed inside
 * a frame, it adds a table control to the chart and writes the rows out
 * below it while the table is open. A chart with a HoverProbe has this
 * already; a chart without one (bars, a histogram) names its own rows.
 */
export function ChartData({
  columns,
  rows,
}: {
  /** Column headings; the first names what each row is (a year, an age). */
  columns: string[]
  /** One row per point, first cell its heading. Only called while the table is open. */
  rows: () => string[][]
}) {
  const { tableEl, offerTable } = useChart()
  useEffect(() => {
    offerTable(true)
    return () => offerTable(false)
  }, [offerTable])
  if (!tableEl) return null
  return createPortal(<DataTable columns={columns} rows={rows()} />, tableEl)
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
