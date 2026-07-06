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
 * Figure 2: the wealth hump — build a nest egg, then spend it down to zero.
 * An optional `compare` path (spending that tracks income) draws as a dashed
 * cardinal line, with a marker at the age its money runs out.
 */
export function WealthChart({
  points,
  peakAge,
  figure = 'Figure 2.',
  caption,
  compare,
  compareLabel = 'Comparison',
  brokeAge,
  brokeLabel,
  exportStats,
}: {
  points: LifeCyclePoint[]
  peakAge: number
  figure?: string
  caption: string
  compare?: LifeCyclePoint[]
  compareLabel?: string
  brokeAge?: number | null
  /** Marker text at brokeAge, e.g. "bankrupt". */
  brokeLabel?: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      figure={figure}
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Wealth building to a peak at retirement then falling to zero"
    >
      <Inner points={points} peakAge={peakAge} compare={compare} compareLabel={compareLabel} brokeAge={brokeAge} brokeLabel={brokeLabel} />
    </ChartFrame>
  )
}

function Inner({
  points,
  peakAge,
  compare,
  compareLabel,
  brokeAge,
  brokeLabel = 'money runs out',
}: {
  points: LifeCyclePoint[]
  peakAge: number
  compare?: LifeCyclePoint[]
  compareLabel: string
  brokeAge?: number | null
  brokeLabel?: string
}) {
  const { innerWidth, innerHeight } = useChart()
  const compareByAge = new Map((compare ?? []).map((p) => [p.age, p]))
  const ages = points.map((p) => p.age)
  const x0 = ages[0]
  const x1 = ages[ages.length - 1] + 1
  const wMin =
    Math.min(0, ...points.map((p) => p.wealth), ...(compare ?? []).map((p) => p.wealth)) * 1.08
  const wMax =
    Math.max(...points.map((p) => p.wealth), ...(compare ?? []).map((p) => p.wealth)) * 1.08

  const x = useMemo(() => scaleLinear().domain([x0, x1]).range([0, innerWidth]), [x0, x1, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([wMin, wMax || 1]).range([innerHeight, 0]).nice(),
    [wMin, wMax, innerHeight]
  )
  const hasDebt = wMin < 0

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={7} format={(v) => `${v}`} />

      <AreaSeries
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        y0={() => 0}
        y1={(d: LifeCyclePoint) => d.wealth}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-2) 26%, var(--surface))"
      />
      <LineSeries
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        y={(d: LifeCyclePoint) => d.wealth}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-2)"
        width={2.5}
        draw
      />

      {/* Zero line — visible when the path dips into borrowing. */}
      {hasDebt && (
        <line
          x1={0}
          x2={innerWidth}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--c-ink-faint)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}

      {compare && (
        <LineSeries
          data={compare}
          x={(d: LifeCyclePoint) => d.age}
          y={(d: LifeCyclePoint) => d.wealth}
          xScale={x}
          yScale={y}
          stroke="var(--c-accent)"
          width={2}
          dashed
        />
      )}

      <line
        x1={x(peakAge)}
        x2={x(peakAge)}
        y1={0}
        y2={innerHeight}
        stroke="var(--c-cardinal)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.65}
      />
      <text x={x(peakAge) + 5} y={12} fontSize={11} fontWeight={600} fill="var(--c-cardinal)">
        peak · {peakAge}
      </text>

      {brokeAge != null && (
        <>
          <line
            x1={x(brokeAge)}
            x2={x(brokeAge)}
            y1={0}
            y2={innerHeight}
            stroke="var(--c-accent)"
            strokeWidth={1.5}
            opacity={0.8}
          />
          <text
            x={x(brokeAge) + 5}
            y={28}
            fontSize={11}
            fontWeight={600}
            fill="var(--c-accent)"
          >
            {brokeLabel} · {brokeAge}
          </text>
        </>
      )}

      <HoverProbe
        data={points}
        x={(d: LifeCyclePoint) => d.age}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Age ${Math.round(v)}`}
        series={[
          {
            label: compare ? 'Net worth, smoothing plan' : 'Net worth',
            color: 'var(--c-series-2)',
            y: (d: LifeCyclePoint) => d.wealth,
            format: (v) => (v < 0 ? `−${formatUSDWhole(-v)} (borrowed)` : formatUSDWhole(v)),
          },
          ...(compare
            ? [
                {
                  label: compareLabel,
                  color: 'var(--c-accent)',
                  y: (d: LifeCyclePoint) => compareByAge.get(d.age)?.wealth ?? NaN,
                  format: (v: number) =>
                    v < 0 ? `−${formatUSDWhole(-v)} (in debt)` : formatUSDWhole(v),
                },
              ]
            : []),
        ]}
      />
    </>
  )
}
