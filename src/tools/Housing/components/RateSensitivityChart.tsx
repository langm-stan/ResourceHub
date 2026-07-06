import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  Annotation,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { paymentFromPV } from '../../../lib/finance'
import { formatPercent, formatUSDWhole } from '../../../lib/format'
import { CREDIT_TIERS } from '../data2026'
import { rateFor, type TermYears } from '../compute'

interface RatePoint {
  rate: number
  payment: number
}

/**
 * Monthly principal and interest swept across rates, with the three credit
 * tiers marked. The same loan, priced three ways: this is what a credit
 * score (or a Fed cycle) is worth in dollars per month.
 */
export function RateSensitivityChart({
  loan,
  termYears,
  caption,
  exportStats,
}: {
  loan: number
  termYears: TermYears
  caption: string
  exportStats?: ExportStat[]
}) {
  const n = termYears * 12
  const points = useMemo(() => {
    const pts: RatePoint[] = []
    for (let r = 0.03; r <= 0.0901; r += 0.001) {
      pts.push({ rate: r, payment: loan > 0 ? paymentFromPV(loan, r / 12, n) : 0 })
    }
    return pts
  }, [loan, n])

  return (
    <ChartFrame
      ratio={0.44}
      maxHeight={420}
      figure="Figure 2."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Monthly payment on a ${termYears}-year loan across interest rates, with credit tiers marked`}
    >
      <Inner points={points} loan={loan} termYears={termYears} n={n} />
    </ChartFrame>
  )
}

function Inner({
  points,
  loan,
  termYears,
  n,
}: {
  points: RatePoint[]
  loan: number
  termYears: TermYears
  n: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const yMax = Math.max(...points.map((p) => p.payment)) * 1.12

  const x = useMemo(() => scaleLinear().domain([0.03, 0.09]).range([0, innerWidth]), [innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  const tiers = CREDIT_TIERS.map((t) => {
    const r = rateFor(t.key, termYears)
    return {
      ...t,
      rate: r,
      payment: loan > 0 ? paymentFromPV(loan, r / 12, n) : 0,
    }
  })

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={formatUSDWhole} />
      <AxisBottom x={x} ticks={6} format={(v) => formatPercent(v, 0)} />

      <LineSeries
        data={points}
        x={(d: RatePoint) => d.rate}
        y={(d: RatePoint) => d.payment}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={2.5}
        draw
      />

      {tiers.map((t, idx) => (
        <Annotation
          key={t.key}
          x={x(t.rate)}
          y={y(t.payment)}
          dx={idx === 0 ? -8 : 8}
          dy={idx === 0 ? 44 : -40}
          label={`${t.label}: ${formatUSDWhole(t.payment)}/mo`}
          align={idx === 0 ? 'end' : 'start'}
          tone={idx === 2 ? 'accent' : 'ink'}
        />
      ))}

      <HoverProbe
        data={points}
        x={(d: RatePoint) => d.rate}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${formatPercent(v, 1)} APR`}
        series={[
          {
            label: 'Monthly P&I',
            color: 'var(--c-series-3)',
            y: (d: RatePoint) => d.payment,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
