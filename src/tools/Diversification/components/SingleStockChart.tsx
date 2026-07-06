import { useMemo } from 'react'
import { scaleLinear, scaleLog } from 'd3-scale'
import type { ScaleLinear } from 'd3-scale'
import {
  AxisBottom,
  ChartFrame,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatUSDCompact } from '../../../lib/format'
import type { SingleStockSim } from '../compute'

/**
 * Figure 3: sixty simulated single stocks (thin grey) against the index
 * (green), all starting from the same $10,000 with the same 8% average
 * return. Log scale, because single-stock outcomes span from nearly
 * nothing to fortunes; the handful of huge winners drag the average up
 * while the median stock goes nowhere.
 */
const START = 10_000

export function SingleStockChart({
  sim,
  caption,
  exportStats,
}: {
  sim: SingleStockSim
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={400}
      figure="Figure 3."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Simulated single stock outcomes fanning out around the index path"
    >
      <Inner sim={sim} />
    </ChartFrame>
  )
}

function Inner({ sim }: { sim: SingleStockSim }) {
  const { innerWidth, innerHeight } = useChart()
  const years = sim.years

  const finals = sim.stocks.map((s) => s.final * START)
  const lo = Math.min(...finals, START) / 3
  const hi = Math.max(...finals, sim.index.final * START) * 1.5

  const x = useMemo(
    () => scaleLinear().domain([0, years]).range([0, innerWidth]),
    [years, innerWidth]
  )
  const y = useMemo(
    () => scaleLog().domain([lo, hi]).range([innerHeight, 0]) as unknown as ScaleLinear<number, number>,
    [lo, hi, innerHeight]
  )

  // Sparse decade ticks on a log axis.
  const ticks = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000].filter(
    (v) => v >= lo && v <= hi
  )

  const data = (values: number[]) => values.map((v, i) => ({ i, v: v * START }))

  return (
    <>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={0} x2={innerWidth} y1={y(v)} y2={y(v)} stroke="var(--border-hairline)" />
          <text
            x={-12}
            y={y(v)}
            dy="0.32em"
            textAnchor="end"
            fontSize={11}
            fill="var(--text-muted)"
          >
            {formatUSDCompact(v)}
          </text>
        </g>
      ))}
      <AxisBottom x={x} ticks={Math.min(years, 8)} format={(v) => `${Math.round(v)} yr`} />

      {/* The starting stake. */}
      <line
        x1={0}
        x2={innerWidth}
        y1={y(START)}
        y2={y(START)}
        stroke="var(--c-ink-faint)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      {sim.stocks.map((s, k) => (
        <LineSeries
          key={k}
          data={data(s.values)}
          x={(d: { i: number; v: number }) => d.i}
          y={(d: { i: number; v: number }) => d.v}
          xScale={x}
          yScale={y}
          stroke="color-mix(in srgb, var(--c-series-3) 38%, var(--surface))"
          width={1}
        />
      ))}
      <LineSeries
        data={data(sim.index.values)}
        x={(d: { i: number; v: number }) => d.i}
        y={(d: { i: number; v: number }) => d.v}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={3}
      />
      <text
        x={innerWidth - 6}
        y={y(sim.index.final * START) - 10}
        textAnchor="end"
        fontSize={12}
        fontWeight={600}
        fill="var(--c-series-1)"
      >
        the index
      </text>
      <text x={6} y={y(START) - 8} fontSize={11} fill="var(--text-faint)">
        {formatUSDCompact(START)} invested
      </text>
    </>
  )
}
