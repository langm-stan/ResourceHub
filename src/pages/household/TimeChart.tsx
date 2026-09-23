import { useMemo, type ReactNode } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  EndLabel,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../design-system/chart'
import { RECESSIONS, type Obs } from '../../data/household/compute'

/*
 * One or more FRED series against time.
 *
 * Every line on the page is drawn by this, so they all read the same way:
 * years along the bottom, recessions shaded, the latest value labelled at
 * the end of its line, and a hover readout that names the period in the
 * series' own terms ("Q2 2026", "Aug 2026").
 */

export interface ChartLine {
  label: string
  obs: Obs[]
  color: string
  dashed?: boolean
  /** Text at the end of the line; defaults to the latest value at hover precision. Null for none. */
  endText?: string | null
}

interface Props {
  lines: ChartLine[]
  /** Axis ticks. */
  format: (v: number) => string
  /** Hover readout and end labels; defaults to format. */
  hoverFormat?: (v: number) => string
  /** How the hovered period reads. */
  periodOf: (d: Date) => string
  /** Start the value axis at zero. On for rates and prices, off where the level is not the point. */
  zero?: boolean
  /** A horizontal reference line, e.g. zero on a chart that goes negative. */
  baseline?: number
  figure: string
  caption: ReactNode
  ariaLabel: string
  exportStats?: ExportStat[]
  /** Room on the right for end labels. */
  rightMargin?: number
}

export function TimeChart(props: Props) {
  return (
    <ChartFrame
      ratio={0.5}
      maxHeight={380}
      margin={{ top: 16, right: props.rightMargin ?? 64, bottom: 34, left: 58 }}
      figure={props.figure}
      /* One span, so the caption's text and links run as a sentence rather
         than as separate items in the caption's flex row. */
      caption={<span>{props.caption}</span>}
      ariaLabel={props.ariaLabel}
      exportStats={props.exportStats}
    >
      <Inner {...props} />
    </ChartFrame>
  )
}

interface Row {
  x: number
  date: Date
  values: (number | undefined)[]
}

function Inner({ lines, format, hoverFormat, periodOf, zero = true, baseline }: Props) {
  const { innerWidth, innerHeight } = useChart()

  /* One row per date across all lines, so the hover readout can list every
     line at the same moment. Lines on the page share their calendars. */
  const rows = useMemo(() => {
    const byX = new Map<number, Row>()
    lines.forEach((l, i) => {
      for (const o of l.obs) {
        const row = byX.get(o.x) ?? { x: o.x, date: o.date, values: lines.map(() => undefined) }
        row.values[i] = o.v
        byX.set(o.x, row)
      }
    })
    return [...byX.values()].sort((a, b) => a.x - b.x)
  }, [lines])

  const x0 = rows[0]!.x
  const x1 = rows[rows.length - 1]!.x
  const x = useMemo(() => scaleLinear().domain([x0, x1]).range([0, innerWidth]), [x0, x1, innerWidth])

  const y = useMemo(() => {
    const all = lines.flatMap((l) => l.obs.map((o) => o.v))
    let lo = Math.min(...all)
    let hi = Math.max(...all)
    if (zero) lo = Math.min(0, lo)
    if (baseline !== undefined) {
      lo = Math.min(lo, baseline)
      hi = Math.max(hi, baseline)
    }
    const pad = (hi - lo) * 0.06
    /* Round the top to a tick. Round the bottom too when it is zero or
       below; otherwise leave it just under the lowest value, since rounding
       100 down to 50 would leave a third of an index chart empty. */
    const [niceLo, niceHi] = scaleLinear()
      .domain([zero && lo >= 0 ? 0 : lo - pad, hi + pad])
      .nice(5)
      .domain()
    return scaleLinear()
      .domain([zero || lo - pad <= 0 ? niceLo! : lo - pad, niceHi!])
      .range([innerHeight, 0])
  }, [lines, zero, baseline, innerHeight])

  /* Year ticks only: a decimal year like 2012.5 would read as nonsense. */
  const yearTicks = Math.max(2, Math.min(8, Math.floor(innerWidth / 90)))

  /* End labels nudged apart when two lines finish close together. */
  const ends = useMemo(() => {
    const placed = lines.filter((l) => l.endText !== null).map((l) => {
      const last = l.obs[l.obs.length - 1]!
      return { line: l, last, py: y(last.v), textDy: 0 }
    })
    const order = [...placed].sort((a, b) => a.py - b.py)
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1]!
      const cur = order[i]!
      const gap = cur.py + cur.textDy - (prev.py + prev.textDy)
      if (gap < 16) cur.textDy += 16 - gap
    }
    return placed
  }, [lines, y])

  const fmtHover = hoverFormat ?? format

  return (
    <>
      <g aria-hidden="true">
        {RECESSIONS.filter(([a, b]) => b > x0 && a < x1).map(([a, b]) => (
          <rect
            key={a}
            x={x(Math.max(a, x0))}
            width={Math.max(1, x(Math.min(b, x1)) - x(Math.max(a, x0)))}
            y={0}
            height={innerHeight}
            fill="var(--c-ink)"
            opacity={0.07}
          />
        ))}
      </g>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={format} />
      <AxisBottom
        x={x}
        ticks={yearTicks}
        format={(v) => (Number.isInteger(v) ? String(v) : '')}
      />
      {baseline !== undefined && (
        <line
          x1={0}
          x2={innerWidth}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="var(--c-ink-muted)"
          strokeWidth={1}
        />
      )}
      {lines.map((l) => (
        <LineSeries
          key={l.label}
          data={l.obs}
          x={(d) => d.x}
          y={(d) => d.v}
          xScale={x}
          yScale={y}
          stroke={l.color}
          width={l.dashed ? 1.75 : 2.25}
          dashed={l.dashed}
        />
      ))}
      {ends.map(({ line, last, py, textDy }) => (
        <EndLabel
          key={line.label}
          x={x(last.x)}
          y={py}
          textDy={textDy}
          text={line.endText ?? fmtHover(last.v)}
          color={line.color}
        />
      ))}
      <HoverProbe
        data={rows}
        x={(r) => r.x}
        xScale={x}
        yScale={y}
        xLabel={(v) => {
          const r = rows.find((row) => row.x === v)
          return r ? periodOf(r.date) : ''
        }}
        series={lines.map((l, i) => ({
          label: l.label,
          color: l.color,
          y: (r: Row) => r.values[i] ?? Number.NaN,
          format: fmtHover,
        }))}
      />
    </>
  )
}
