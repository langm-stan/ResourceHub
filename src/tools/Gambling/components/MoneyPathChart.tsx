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
import type { PathPoint } from '../compute'

/**
 * Figure 1: the same weekly dollars, three destinations. Grey: total
 * put in. Cardinal: the gambler's expected pocket. Green: the index
 * fund balance at the long-run average return.
 */
export function MoneyPathChart({
  points,
  gameLabel,
  caption,
  exportStats,
}: {
  points: PathPoint[]
  gameLabel: string
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="The same weekly dollars gambled versus invested over time"
    >
      <Inner points={points} gameLabel={gameLabel} />
    </ChartFrame>
  )
}

function Inner({ points, gameLabel }: { points: PathPoint[]; gameLabel: string }) {
  const { innerWidth, innerHeight } = useChart()
  const t0 = points[0]!.year
  const t1 = points[points.length - 1]!.year
  const top = Math.max(...points.map((p) => p.invested)) * 1.08

  const x = useMemo(
    () => scaleLinear().domain([t0, t1]).range([0, innerWidth]),
    [t0, t1, innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, top || 1]).range([innerHeight, 0]).nice(),
    [top, innerHeight]
  )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={7} format={(v) => `${Math.round(v)}`} />

      <LineSeries
        data={points}
        x={(d: PathPoint) => d.year}
        y={(d: PathPoint) => d.staked}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={2}
      />
      <LineSeries
        data={points}
        x={(d: PathPoint) => d.year}
        y={(d: PathPoint) => d.pocket}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2.5}
        dashed
      />
      <LineSeries
        data={points}
        x={(d: PathPoint) => d.year}
        y={(d: PathPoint) => d.invested}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      <HoverProbe
        data={points}
        x={(d: PathPoint) => d.year}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${Math.round(v)}`}
        series={[
          {
            label: 'SPY balance',
            color: 'var(--c-series-1)',
            y: (d: PathPoint) => d.invested,
            format: formatUSDWhole,
          },
          {
            label: 'Total put in',
            color: 'var(--c-series-3)',
            y: (d: PathPoint) => d.staked,
            format: formatUSDWhole,
          },
          {
            label: `Expected pocket, ${gameLabel.toLowerCase()}`,
            color: 'var(--c-accent)',
            y: (d: PathPoint) => d.pocket,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
