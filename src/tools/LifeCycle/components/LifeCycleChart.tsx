import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AreaSeries,
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
import type { LifeCyclePoint } from '../compute'

/**
 * Figure 1: the income path (slate area) vs. smoothed consumption (green
 * line). An optional `compare` path (e.g. spending that tracks income in the
 * NFL case) draws as a dashed cardinal line.
 */
export function LifeCycleChart({
  points,
  retireAge,
  figure = 'Figure 1.',
  caption,
  compare,
  compareLabel = 'Comparison',
  exportStats,
}: {
  points: LifeCyclePoint[]
  retireAge: number
  figure?: string
  caption: string
  compare?: LifeCyclePoint[]
  compareLabel?: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={440}
      figure={figure}
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Income over the lifetime compared with smoothed consumption"
    >
      <Inner points={points} retireAge={retireAge} compare={compare} compareLabel={compareLabel} />
    </ChartFrame>
  )
}

function Inner({
  points,
  retireAge,
  compare,
  compareLabel,
}: {
  points: LifeCyclePoint[]
  retireAge: number
  compare?: LifeCyclePoint[]
  compareLabel: string
}) {
  const { innerWidth, innerHeight } = useChart()
  const compareByAge = new Map((compare ?? []).map((p) => [p.age, p]))
  const ages = points.map((p) => p.age)
  const x0 = ages[0]
  const x1 = ages[ages.length - 1] + 1
  const yMax =
    Math.max(
      ...points.map((p) => Math.max(p.income, p.consumption)),
      ...(compare ?? []).map((p) => p.consumption)
    ) * 1.06

  const x = useMemo(() => scaleLinear().domain([x0, x1]).range([0, innerWidth]), [x0, x1, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={7} format={(v) => `${v}`} />

      <AreaSeries
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        y0={() => 0}
        y1={(d: LifeCyclePoint) => d.income}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-3) 22%, var(--surface))"
      />
      <LineSeries
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        y={(d: LifeCyclePoint) => d.income}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={1.5}
      />
      <LineSeries
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        y={(d: LifeCyclePoint) => d.consumption}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />
      {compare && (
        <LineSeries
          data={compare}
          x={(d: LifeCyclePoint) => d.age}
          y={(d: LifeCyclePoint) => d.consumption}
          xScale={x}
          yScale={y}
          stroke="var(--c-accent)"
          width={2}
          dashed
        />
      )}

      {/* Retirement marker */}
      <line
        x1={x(retireAge)}
        x2={x(retireAge)}
        y1={0}
        y2={innerHeight}
        stroke="var(--c-cardinal)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.65}
      />
      <text
        x={x(retireAge) + 5}
        y={12}
        fontSize={11}
        fontWeight={600}
        fill="var(--c-cardinal)"
      >
        retire · {retireAge}
      </text>

      <HoverProbe
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Age ${Math.round(v)}`}
        series={[
          { label: 'Income', color: 'var(--c-series-3)', y: (d: LifeCyclePoint) => d.income, format: formatUSDWhole },
          {
            label: compare ? 'Smoothing plan' : 'Consumption',
            color: 'var(--c-series-1)',
            y: (d: LifeCyclePoint) => d.consumption,
            format: formatUSDWhole,
          },
          ...(compare
            ? // With two scenarios on the chart, keep the tooltip to the two
              // spending paths; Figure 2's hover carries net worth for both.
              [
                {
                  label: compareLabel,
                  color: 'var(--c-accent)',
                  y: (d: LifeCyclePoint) => compareByAge.get(d.age)?.consumption ?? NaN,
                  format: formatUSDWhole,
                },
              ]
            : [
                {
                  label: 'Saved that year',
                  y: (d: LifeCyclePoint) => d.saving,
                  format: (v: number) => (v < 0 ? `−${formatUSDWhole(-v)}` : formatUSDWhole(v)),
                },
                {
                  // Net worth so far, matching Figure 2's color. No dot: wealth
                  // is an order of magnitude above this chart's income scale.
                  label: 'Net worth so far',
                  color: 'var(--c-series-2)',
                  dot: false,
                  y: (d: LifeCyclePoint) => d.wealth,
                  format: (v: number) =>
                    v < 0 ? `−${formatUSDWhole(-v)} (borrowed)` : formatUSDWhole(v),
                },
              ]),
        ]}
      />
    </>
  )
}
