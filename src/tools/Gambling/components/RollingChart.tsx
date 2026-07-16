import { useMemo } from 'react'
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
} from '../../../design-system/chart'
import { formatPercent } from '../../../lib/format'
import type { RollingSeriesPoint } from '../compute'

export interface ChartSeries {
  points: RollingSeriesPoint[]
  /** Window length in years; 1 means plain calendar-year returns. */
  period: number
  /** Tooltip label, e.g. "Stocks (S&P 500)". */
  label: string
  /** Right-edge label, e.g. "Stocks". */
  short: string
  color: string
}

/**
 * Rolling returns over time: the stocks series, and optionally one
 * comparison asset, each annualized over its own window length.
 */
export function RollingChart({
  stocks,
  compare,
  figure,
  caption,
  exportStats,
}: {
  stocks: ChartSeries
  compare?: ChartSeries
  figure: string
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.52}
      maxHeight={480}
      margin={{ right: 92 }}
      figure={figure}
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Annualized rolling returns over time for ${stocks.label}${compare ? ` and ${compare.label}` : ''}`}
    >
      <Inner stocks={stocks} compare={compare} />
    </ChartFrame>
  )
}

/** One row per window end-year; either series may be absent in a year. */
interface MergedPoint {
  end: number
  sp: number
  cmp: number
}

function Inner({ stocks, compare }: { stocks: ChartSeries; compare?: ChartSeries }) {
  const { innerWidth, innerHeight } = useChart()

  const merged = useMemo(() => {
    const byEnd = new Map<number, MergedPoint>()
    for (const p of stocks.points) byEnd.set(p.end, { end: p.end, sp: p.v, cmp: NaN })
    for (const p of compare?.points ?? []) {
      const row = byEnd.get(p.end)
      if (row) row.cmp = p.v
      else byEnd.set(p.end, { end: p.end, sp: NaN, cmp: p.v })
    }
    return [...byEnd.values()].sort((a, b) => a.end - b.end)
  }, [stocks, compare])

  const x = useMemo(
    () =>
      scaleLinear()
        .domain([merged[0]!.end, merged[merged.length - 1]!.end])
        .range([0, innerWidth]),
    [merged, innerWidth]
  )
  const y = useMemo(() => {
    let lo = 0
    let hi = 0
    for (const s of compare ? [stocks, compare] : [stocks]) {
      for (const p of s.points) {
        lo = Math.min(lo, p.v)
        hi = Math.max(hi, p.v)
      }
    }
    const pad = (hi - lo) * 0.06
    return scaleLinear().domain([lo - pad, hi + pad]).range([innerHeight, 0]).nice()
  }, [stocks, compare, innerHeight])

  /* Spread the right-edge labels apart when the lines converge. */
  const endLabels = useMemo(() => {
    const entries = (compare ? [stocks, compare] : [stocks]).map((s) => ({
      s,
      lineY: y(s.points[s.points.length - 1]!.v),
    }))
    const sorted = [...entries].sort((a, b) => a.lineY - b.lineY)
    const MIN_GAP = 14
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.lineY - sorted[i - 1]!.lineY < MIN_GAP) {
        sorted[i]!.lineY = sorted[i - 1]!.lineY + MIN_GAP
      }
    }
    return entries.map((e) => ({
      s: e.s,
      textDy: e.lineY - y(e.s.points[e.s.points.length - 1]!.v),
    }))
  }, [stocks, compare, y])

  const windowWord = (s: ChartSeries) =>
    s.period === 1 ? 'year' : `${s.period}-year stretch`

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={7} format={(v) => String(Math.round(v))} />

      {/* Losing territory starts here. */}
      <line
        x1={0}
        x2={innerWidth}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--c-ink-faint)"
        strokeWidth={1.25}
        strokeDasharray="2 3"
      />
      <text x={6} y={y(0) + 14} fontSize={11} fill="var(--text-faint)">
        below this line, the {windowWord(stocks)} lost money
      </text>

      {compare && (
        <LineSeries
          data={compare.points}
          x={(d: RollingSeriesPoint) => d.end}
          y={(d: RollingSeriesPoint) => d.v}
          xScale={x}
          yScale={y}
          stroke={compare.color}
          width={2}
          draw
        />
      )}
      <LineSeries
        data={stocks.points}
        x={(d: RollingSeriesPoint) => d.end}
        y={(d: RollingSeriesPoint) => d.v}
        xScale={x}
        yScale={y}
        stroke={stocks.color}
        width={2.5}
        draw
      />

      {endLabels.map(({ s, textDy }, i) => (
        <EndLabel
          key={`${s.short}-${i}`}
          x={x(s.points[s.points.length - 1]!.end)}
          y={y(s.points[s.points.length - 1]!.v)}
          textDy={textDy}
          text={s.short}
          color={s.color}
        />
      ))}

      <HoverProbe
        data={merged}
        x={(d: MergedPoint) => d.end}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Windows ending ${Math.round(v)}`}
        series={[
          {
            label: `${stocks.label}, ${windowWord(stocks)}`,
            color: stocks.color,
            y: (d: MergedPoint) => d.sp,
            format: (v) => `${formatPercent(v, 1)}/yr`,
          },
          ...(compare
            ? [
                {
                  label: `${compare.label}, ${windowWord(compare)}`,
                  color: compare.color,
                  y: (d: MergedPoint) => d.cmp,
                  format: (v: number) => `${formatPercent(v, 1)}/yr`,
                },
              ]
            : []),
        ]}
      />
    </>
  )
}
