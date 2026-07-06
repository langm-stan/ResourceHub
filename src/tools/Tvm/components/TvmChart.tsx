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
import { formatUSDCompact, formatUSDWhole, formatYears } from '../../../lib/format'
import type { BalancePoint, TvmResults } from '../compute'

export function TvmChart({
  results,
  years,
  overlayHeader,
}: {
  results: TvmResults
  years: number
  overlayHeader?: React.ReactNode
}) {
  const isLoan = results.mode === 'loan'
  const caption = isLoan
    ? `What you still owe over ${years} years. The area shrinking to zero is the loan being paid off.`
    : `Your savings building toward the goal over ${years} years. The dashed line is your target.`
  const exportStats: ExportStat[] = isLoan
    ? [
        { label: 'Monthly payment', value: formatUSDWhole(results.payment), color: 'var(--c-accent)' },
        { label: "Total you'll pay", value: formatUSDWhole(results.totalPaid) },
        { label: 'Of that, interest', value: formatUSDWhole(results.totalInterest), color: 'var(--c-series-2)' },
      ]
    : [
        { label: 'Save each month', value: formatUSDWhole(results.payment), color: 'var(--c-accent)' },
        { label: "You'll contribute", value: formatUSDWhole(results.totalPaid) },
        { label: 'Interest adds', value: formatUSDWhole(results.totalInterest), color: 'var(--c-series-1)' },
      ]
  return (
    <ChartFrame
      ratio={0.5}
      figure="Figure 1."
      caption={caption}
      overlayHeader={overlayHeader}
      exportStats={exportStats}
      ariaLabel={isLoan ? 'Remaining loan balance falling to zero' : 'Savings growing toward the goal'}
    >
      <Inner results={results} years={years} />
    </ChartFrame>
  )
}

function Inner({ results, years }: { results: TvmResults; years: number }) {
  const { innerWidth, innerHeight } = useChart()
  const isLoan = results.mode === 'loan'
  const data = results.balanceSeries
  const yMax = isLoan ? results.amount : results.amount * 1.05

  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight],
  )

  const color = isLoan ? 'var(--c-series-2)' : 'var(--c-series-1)'
  const fill = isLoan
    ? 'color-mix(in srgb, var(--c-series-2) 22%, var(--surface))'
    : 'color-mix(in srgb, var(--c-series-1) 22%, var(--surface))'

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={Math.min(8, years)} format={(v) => (v === 0 ? '0' : `${v}y`)} />

      <AreaSeries
        data={data}
        x={(d: BalancePoint) => d.t}
        y0={() => 0}
        y1={(d: BalancePoint) => d.balance}
        xScale={x}
        yScale={y}
        fill={fill}
      />
      <LineSeries
        data={data}
        x={(d: BalancePoint) => d.t}
        y={(d: BalancePoint) => d.balance}
        xScale={x}
        yScale={y}
        stroke={color}
        width={2.5}
        draw
      />

      {!isLoan && (
        <g>
          <line
            x1={0}
            x2={innerWidth}
            y1={y(results.amount)}
            y2={y(results.amount)}
            stroke="var(--c-cardinal)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={innerWidth - 4}
            y={y(results.amount) - 6}
            textAnchor="end"
            fontSize={12}
            fontWeight={600}
            fill="var(--c-cardinal)"
          >
            goal · {formatUSDWhole(results.amount)}
          </text>
        </g>
      )}

      <HoverProbe
        data={data}
        x={(d: BalancePoint) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 0 ? 'Start' : `After ${formatYears(v)}`)}
        series={[
          {
            label: isLoan ? 'Still owed' : 'Saved so far',
            color,
            y: (d: BalancePoint) => d.balance,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
