import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AreaSeries,
  AxisBottom,
  AxisLeft,
  ChartData,
  ChartFrame,
  Gridlines,
  LineSeries,
  useChart,
} from '../../design-system/chart'
import { formatUSDCompact, formatUSDWhole } from '../../lib/format'
import type { SeriesPoint } from '../../lib/finance'

export function GoalChart({
  points,
  years,
  overlayHeader,
}: {
  points: SeriesPoint[]
  years: number
  overlayHeader?: React.ReactNode
}) {
  return (
    <ChartFrame
      ratio={0.5}
      figure="Figure 1."
      caption={`Investing your monthly surplus for ${years} years. The gap above your contributions is interest.`}
      overlayHeader={overlayHeader}
      ariaLabel="Projected growth of invested monthly surplus"
    >
      <Inner points={points} years={years} />
    </ChartFrame>
  )
}

function Inner({ points, years }: { points: SeriesPoint[]; years: number }) {
  const { innerWidth, innerHeight } = useChart()
  const max = points.length ? points[points.length - 1]!.balance : 1
  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, (max || 1) * 1.04]).range([innerHeight, 0]).nice(),
    [max, innerHeight],
  )

  // The series is finer than a year; the table keeps the whole years.
  const byYear = () => {
    const whole = points.filter((p) => Math.abs(p.t - Math.round(p.t)) < 1e-6)
    return (whole.length > 1 ? whole : points).map((p) => [
      p.t === 0 ? 'Start' : `Year ${Math.round(p.t * 100) / 100}`,
      formatUSDWhole(p.principalContributed),
      formatUSDWhole(p.balance),
    ])
  }

  return (
    <>
      <ChartData columns={['Time', 'Contributed', 'Balance']} rows={byYear} />
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={Math.min(8, years)} format={(v) => (v === 0 ? '0' : `${v}y`)} />
      <AreaSeries
        data={points}
        x={(d: SeriesPoint) => d.t}
        y0={() => 0}
        y1={(d: SeriesPoint) => d.principalContributed}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-3) 20%, var(--surface))"
      />
      <AreaSeries
        data={points}
        x={(d: SeriesPoint) => d.t}
        y0={(d: SeriesPoint) => d.principalContributed}
        y1={(d: SeriesPoint) => d.balance}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-1) 32%, var(--surface))"
      />
      <LineSeries
        data={points}
        x={(d: SeriesPoint) => d.t}
        y={(d: SeriesPoint) => d.balance}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />
    </>
  )
}
