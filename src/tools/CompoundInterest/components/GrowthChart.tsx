import { useMemo, type ReactNode } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AreaSeries,
  AxisBottom,
  AxisLeft,
  Annotation,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  VMarker,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatUSDCompact, formatUSDWhole, formatYears } from '../../../lib/format'
import type { SeriesPoint } from '../../../lib/finance'
import type { Results } from '../compute'
import type { Scenario } from '../state'

const PRINCIPAL_FILL = 'color-mix(in srgb, var(--c-series-3) 16%, var(--surface))'
const SIMPLE_FILL = 'color-mix(in srgb, var(--c-series-2) 26%, var(--surface))'
const IOI_FILL = 'color-mix(in srgb, var(--c-series-1) 42%, var(--surface))'

interface GrowthChartProps {
  scenario: Scenario
  results: Results
  /** Headline stats to repeat above the chart in the expanded view. */
  overlayHeader?: ReactNode
}

export function GrowthChart({ scenario, results, overlayHeader }: GrowthChartProps) {
  if (results.mode === 'pv') {
    return <PvChart scenario={scenario} results={results} overlayHeader={overlayHeader} />
  }
  return <FvChart scenario={scenario} results={results} overlayHeader={overlayHeader} />
}

/* ---- Future-value growth: three stacked teaching bands ----------------- */
function FvChart({ scenario, results, overlayHeader }: GrowthChartProps) {
  const data = results.series
  const maxY = results.final.balance || 1

  const caption = (
    <>
      Growth of {formatUSDWhole(scenario.principal)}
      {scenario.contribution
        ? ` plus ${formatUSDWhole(scenario.contribution.amount)} added each period`
        : ''}{' '}
      at {scenario.ratePct}%, compounded {scenario.frequency}. The green wedge is interest
      earning interest.
    </>
  )

  const exportStats: ExportStat[] = [
    { label: `Balance after ${scenario.years} years`, value: formatUSDWhole(results.final.balance), color: 'var(--c-series-1)' },
    { label: 'Principal put in', value: formatUSDWhole(results.final.principalContributed), color: 'var(--c-series-3)' },
    { label: 'Interest on interest', value: formatUSDWhole(results.final.interestOnInterest), color: 'var(--c-series-1)' },
  ]

  return (
    <ChartFrame
      ratio={0.52}
      figure="Figure 1."
      caption={caption}
      overlayHeader={overlayHeader}
      exportStats={exportStats}
      ariaLabel="Stacked area chart of account growth decomposed into principal, simple interest, and interest on interest"
    >
      <FvInner data={data} maxY={maxY} years={scenario.years} results={results} />
    </ChartFrame>
  )
}

function FvInner({
  data,
  maxY,
  years,
  results,
}: {
  data: SeriesPoint[]
  maxY: number
  years: number
  results: Results
}) {
  const { innerWidth, innerHeight } = useChart()

  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, maxY * 1.04]).range([innerHeight, 0]).nice(),
    [maxY, innerHeight],
  )

  const last = data[data.length - 1]!
  const simpleTop = (d: SeriesPoint) => d.principalContributed + d.simpleInterest

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={6} format={(v) => (v === 0 ? '0' : `${v}y`)} />

      <AreaSeries
        data={data}
        x={(d) => d.t}
        y0={() => 0}
        y1={(d) => d.principalContributed}
        xScale={x}
        yScale={y}
        fill={PRINCIPAL_FILL}
        stroke="var(--c-series-3)"
      />
      <AreaSeries
        data={data}
        x={(d) => d.t}
        y0={(d) => d.principalContributed}
        y1={simpleTop}
        xScale={x}
        yScale={y}
        fill={SIMPLE_FILL}
      />
      <AreaSeries
        data={data}
        x={(d) => d.t}
        y0={simpleTop}
        y1={(d) => d.balance}
        xScale={x}
        yScale={y}
        fill={IOI_FILL}
      />
      <LineSeries
        data={data}
        x={(d) => d.t}
        y={simpleTop}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-2)"
        width={1.5}
        dashed
      />
      <LineSeries
        data={data}
        x={(d) => d.t}
        y={(d) => d.balance}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      {results.doublingYears != null && results.doublingYears <= years && (
        <VMarker x={results.doublingYears} xScale={x} label={`doubles · ${formatYears(results.doublingYears)}`} />
      )}

      {results.interestOnInterest > 1 && (
        <Annotation
          x={x(last.t)}
          y={y((simpleTop(last) + last.balance) / 2)}
          dx={-70}
          dy={-10}
          label="interest on interest"
          tone="accent"
          align="end"
        />
      )}

      <HoverProbe
        data={data}
        x={(d: SeriesPoint) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 0 ? 'Start' : `After ${formatYears(v)}`)}
        series={[
          { label: 'Balance', color: 'var(--c-series-1)', y: (d: SeriesPoint) => d.balance, format: formatUSDWhole },
          { label: 'Principal put in', color: 'var(--c-series-3)', y: (d: SeriesPoint) => d.principalContributed, format: formatUSDWhole },
          {
            label: 'Simple interest',
            color: 'var(--c-series-2)',
            y: (d: SeriesPoint) => d.simpleInterest,
            dotY: simpleTop,
            format: formatUSDWhole,
          },
          {
            label: 'Interest on interest',
            color: 'var(--c-series-1)',
            y: (d: SeriesPoint) => d.interestOnInterest,
            dot: false,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}

/* ---- Present-value discount curve -------------------------------------- */
function PvChart({ scenario, results, overlayHeader }: GrowthChartProps) {
  const caption = (
    <>
      The present value of {formatUSDWhole(results.futureAmount)} received in the future,
      discounted at {scenario.ratePct}%. Value collapses as the payoff recedes in time.
    </>
  )
  const exportStats: ExportStat[] = [
    { label: 'Worth today', value: formatUSDWhole(results.headline), color: 'var(--c-series-1)' },
    { label: `Received in ${scenario.years} years`, value: formatUSDWhole(results.futureAmount) },
  ]

  return (
    <ChartFrame
      ratio={0.52}
      figure="Figure 1."
      caption={caption}
      overlayHeader={overlayHeader}
      exportStats={exportStats}
      ariaLabel="Curve showing how the present value of a future sum falls as the time horizon grows"
    >
      <PvInner results={results} years={scenario.years} />
    </ChartFrame>
  )
}

function PvInner({ results, years }: { results: Results; years: number }) {
  const { innerWidth, innerHeight } = useChart()
  const data = results.pvSeries
  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, results.futureAmount * 1.04]).range([innerHeight, 0]).nice(),
    [results.futureAmount, innerHeight],
  )
  const last = data[data.length - 1]!

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={6} format={(v) => (v === 0 ? 'today' : `${v}y`)} />
      <AreaSeries
        data={data}
        x={(d) => d.t}
        y0={() => 0}
        y1={(d) => d.value}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-1) 22%, var(--surface))"
      />
      <LineSeries
        data={data}
        x={(d) => d.t}
        y={(d) => d.value}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />
      <Annotation
        x={x(last.t)}
        y={y(last.value)}
        dx={-12}
        dy={-34}
        label={`${formatUSDWhole(results.headline)} today`}
        tone="mark"
        align="end"
      />

      <HoverProbe
        data={data}
        x={(d) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 0 ? 'Received today' : `Received in ${formatYears(v)}`)}
        series={[
          { label: 'Worth today', color: 'var(--c-series-1)', y: (d) => d.value, format: formatUSDWhole },
        ]}
      />
    </>
  )
}
