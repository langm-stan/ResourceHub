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
import { formatPercent } from '../../../lib/format'
import type { AheadPoint } from '../compute'

/**
 * Figure 2: the chance of being ahead as time passes. The bettor's
 * curve decays toward zero, the investor's climbs toward one; the
 * same law of large numbers drives both.
 */
export function AheadChart({
  points,
  caption,
  exportStats,
}: {
  points: AheadPoint[]
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      figure="Figure 2."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Chance of being ahead over time for a weekly bettor and a buy-and-hold investor"
    >
      <Inner points={points} />
    </ChartFrame>
  )
}

function Inner({ points }: { points: AheadPoint[] }) {
  const { innerWidth, innerHeight } = useChart()
  const years = points[points.length - 1]!.year

  const x = useMemo(
    () => scaleLinear().domain([Math.min(1, years), years]).range([0, innerWidth]),
    [years, innerWidth]
  )
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([innerHeight, 0]), [innerHeight])

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={Math.min(years, 8)} format={(v) => `${Math.round(v)} yr`} />

      {/* The coin-toss line: a fair game would sit here. */}
      <line
        x1={0}
        x2={innerWidth}
        y1={y(0.5)}
        y2={y(0.5)}
        stroke="var(--c-ink-faint)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <text x={6} y={y(0.5) - 6} fontSize={11} fill="var(--text-faint)">
        a fair coin toss
      </text>

      <LineSeries
        data={points}
        x={(d: AheadPoint) => d.year}
        y={(d: AheadPoint) => d.bettor}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2.5}
        draw
      />
      <LineSeries
        data={points}
        x={(d: AheadPoint) => d.year}
        y={(d: AheadPoint) => d.investor}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      <HoverProbe
        data={points}
        x={(d: AheadPoint) => d.year}
        xScale={x}
        yScale={y}
        xLabel={(v) => `After ${Math.round(v)} ${Math.round(v) === 1 ? 'year' : 'years'}`}
        series={[
          {
            label: 'Investor ahead',
            color: 'var(--c-series-1)',
            y: (d: AheadPoint) => d.investor,
            format: (v) => formatPercent(v, 0),
          },
          {
            label: 'Bettor ahead',
            color: 'var(--c-accent)',
            y: (d: AheadPoint) => d.bettor,
            format: (v) => (v < 0.005 && v > 0 ? 'under 0.5%' : formatPercent(v, 0)),
          },
        ]}
      />
    </>
  )
}
