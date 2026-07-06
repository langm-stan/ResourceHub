import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatUSDCompact, formatUSDWhole } from '../../../lib/format'
import type { Bottom, TimingPoint } from '../compute'

/**
 * Figure 1: three wealth paths on real S&P 500 data. Green: invest every
 * month. Slate: hold cash and buy every bear-market bottom exactly (the
 * hindsight strategy). Cardinal dashed: the same, one month late.
 * Vertical markers show the bottoms.
 */
export function TimingChart({
  points,
  bottoms,
  caption,
  exportStats,
}: {
  points: TimingPoint[]
  bottoms: Bottom[]
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.44}
      maxHeight={400}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Wealth over time for a monthly buyer versus bottom-timing strategies on real S&P 500 data"
    >
      <Inner points={points} bottoms={bottoms} />
    </ChartFrame>
  )
}

function Inner({ points, bottoms }: { points: TimingPoint[]; bottoms: Bottom[] }) {
  const { innerWidth, innerHeight } = useChart()
  const t0 = points[0]!.t
  const t1 = points[points.length - 1]!.t
  const top = Math.max(...points.map((p) => Math.max(p.monthly, p.perfect, p.late))) * 1.06

  const x = useMemo(() => scaleLinear().domain([t0, t1]).range([0, innerWidth]), [t0, t1, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, top || 1]).range([innerHeight, 0]).nice(),
    [top, innerHeight]
  )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={7} format={(v) => `${Math.round(v)}`} />

      {bottoms.map((b) => (
        <g key={b.index}>
          <line
            x1={x(b.y + (b.m - 0.5) / 12)}
            x2={x(b.y + (b.m - 0.5) / 12)}
            y1={0}
            y2={innerHeight}
            stroke="var(--c-ink-faint)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
          <text
            x={x(b.y + (b.m - 0.5) / 12) + 4}
            y={innerHeight - 8}
            fontSize={10.5}
            fill="var(--text-faint)"
          >
            {b.y}
          </text>
        </g>
      ))}

      <LineSeries
        data={points}
        x={(d: TimingPoint) => d.t}
        y={(d: TimingPoint) => d.perfect}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={2}
      />
      <LineSeries
        data={points}
        x={(d: TimingPoint) => d.t}
        y={(d: TimingPoint) => d.late}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2}
        dashed
      />
      <LineSeries
        data={points}
        x={(d: TimingPoint) => d.t}
        y={(d: TimingPoint) => d.monthly}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      <HoverProbe
        data={points}
        x={(d: TimingPoint) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${Math.floor(v)}`}
        series={[
          {
            label: 'Buys every month',
            color: 'var(--c-series-1)',
            y: (d: TimingPoint) => d.monthly,
            format: formatUSDWhole,
          },
          {
            label: 'Buys every bottom exactly',
            color: 'var(--c-series-3)',
            y: (d: TimingPoint) => d.perfect,
            format: formatUSDWhole,
          },
          {
            label: 'One month late',
            color: 'var(--c-accent)',
            y: (d: TimingPoint) => d.late,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
