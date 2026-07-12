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
  VMarker,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { paymentFromPV } from '../../../lib/finance'
import { formatUSDWhole } from '../../../lib/format'

interface TermPoint {
  years: number
  payment: number
  totalInterest: number
}

const MIN_YEARS = 10
const MAX_YEARS = 100

/** Axis-sized dollar labels: $500K, $1M, $1.5M. */
const formatUSDCompact = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : v >= 1_000
      ? `$${Math.round(v / 1_000)}K`
      : `$${Math.round(v)}`

function sweep(loan: number, monthlyRate: number): TermPoint[] {
  const pts: TermPoint[] = []
  for (let t = MIN_YEARS; t <= MAX_YEARS + 0.001; t += 1) {
    const payment = loan > 0 ? paymentFromPV(loan, monthlyRate, t * 12) : 0
    pts.push({ years: t, payment, totalInterest: payment * t * 12 - loan })
  }
  return pts
}

/**
 * Monthly principal and interest swept across loan lengths, with the
 * interest-only payment drawn as the floor the curve approaches. Stretching
 * the term buys less and less payment relief while total interest climbs.
 */
export function TermLengthChart({
  loan,
  rate,
  highlightYears,
  caption,
  exportStats,
}: {
  loan: number
  /** Annual rate as a decimal, held fixed across terms. */
  rate: number
  /** The term picked on the slider, marked on the curve. */
  highlightYears: number
  caption: string
  exportStats?: ExportStat[]
}) {
  const i = rate / 12
  const points = useMemo(() => sweep(loan, i), [loan, i])

  return (
    <ChartFrame
      ratio={0.44}
      maxHeight={420}
      figure="Figure 3."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Monthly payment by loan length, with the interest-only payment as the floor"
    >
      <PaymentInner points={points} loan={loan} monthlyRate={i} highlightYears={highlightYears} />
    </ChartFrame>
  )
}

function PaymentInner({
  points,
  loan,
  monthlyRate,
  highlightYears,
}: {
  points: TermPoint[]
  loan: number
  monthlyRate: number
  highlightYears: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const ioPayment = loan * monthlyRate
  const yMax = Math.max(...points.map((p) => p.payment)) * 1.12

  const x = useMemo(
    () => scaleLinear().domain([MIN_YEARS, MAX_YEARS]).range([0, innerWidth]),
    [innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  const at = (years: number) => points.find((p) => p.years === years)!
  const highlight = at(Math.round(highlightYears))

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={formatUSDWhole} />
      <AxisBottom x={x} ticks={9} format={(v) => `${v} yr`} />

      <LineSeries
        data={[
          { years: MIN_YEARS, payment: ioPayment },
          { years: MAX_YEARS, payment: ioPayment },
        ]}
        x={(d: { years: number }) => d.years}
        y={(d: { payment: number }) => d.payment}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2}
        dashed
      />

      <LineSeries
        data={points}
        x={(d: TermPoint) => d.years}
        y={(d: TermPoint) => d.payment}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={2.5}
        draw
      />

      {Math.abs(highlightYears - 30) > 7 && (
        <Annotation
          x={x(30)}
          y={y(at(30).payment)}
          dx={8}
          dy={-36}
          label={`30-year: ${formatUSDWhole(at(30).payment)}/mo`}
          align="start"
          tone="ink"
        />
      )}
      <Annotation
        x={x(highlight.years)}
        y={y(highlight.payment)}
        dx={highlight.years > 75 ? -10 : 10}
        dy={-44}
        label={`${highlight.years}-year: ${formatUSDWhole(highlight.payment)}/mo`}
        align={highlight.years > 75 ? 'end' : 'start'}
        tone="mark"
      />
      <Annotation
        x={x(MAX_YEARS)}
        y={y(ioPayment)}
        dx={-4}
        dy={30}
        label={`Interest-only: ${formatUSDWhole(ioPayment)}/mo, forever`}
        align="end"
        tone="accent"
      />

      <HoverProbe
        data={points}
        x={(d: TermPoint) => d.years}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${Math.round(v)}-year loan`}
        series={[
          {
            label: 'Monthly P&I',
            color: 'var(--c-series-3)',
            y: (d: TermPoint) => d.payment,
            format: formatUSDWhole,
          },
          {
            label: 'Total interest',
            color: 'var(--c-accent)',
            y: (d: TermPoint) => d.totalInterest,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}

/**
 * Total interest over the life of the loan, by loan length. It rises without
 * leveling off; the interest-only loan is deliberately absent, since with no
 * end to the loan there is no end to the interest.
 */
export function TermInterestChart({
  loan,
  rate,
  highlightYears,
  caption,
  exportStats,
}: {
  loan: number
  rate: number
  highlightYears: number
  caption: string
  exportStats?: ExportStat[]
}) {
  const i = rate / 12
  const points = useMemo(() => sweep(loan, i), [loan, i])

  return (
    <ChartFrame
      ratio={0.44}
      maxHeight={420}
      figure="Figure 4."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Total interest over the life of the loan, by loan length"
    >
      <InterestInner points={points} loan={loan} highlightYears={highlightYears} />
    </ChartFrame>
  )
}

function InterestInner({
  points,
  loan,
  highlightYears,
}: {
  points: TermPoint[]
  loan: number
  highlightYears: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const yMax = Math.max(...points.map((p) => p.totalInterest)) * 1.12

  const x = useMemo(
    () => scaleLinear().domain([MIN_YEARS, MAX_YEARS]).range([0, innerWidth]),
    [innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  const at = (years: number) => points.find((p) => p.years === years)!
  const highlight = at(Math.round(highlightYears))

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={formatUSDCompact} />
      <AxisBottom x={x} ticks={9} format={(v) => `${v} yr`} />

      <LineSeries
        data={[
          { years: MIN_YEARS, totalInterest: loan },
          { years: MAX_YEARS, totalInterest: loan },
        ]}
        x={(d: { years: number }) => d.years}
        y={(d: { totalInterest: number }) => d.totalInterest}
        xScale={x}
        yScale={y}
        stroke="var(--c-ink-faint, #999)"
        width={1.5}
        dashed
      />

      <LineSeries
        data={points}
        x={(d: TermPoint) => d.years}
        y={(d: TermPoint) => d.totalInterest}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2.5}
        draw
      />

      {Math.abs(highlightYears - 30) > 7 && (
        <Annotation
          x={x(30)}
          y={y(at(30).totalInterest)}
          dx={8}
          dy={-36}
          label={`30-year: ${formatUSDWhole(at(30).totalInterest)}`}
          align="start"
          tone="ink"
        />
      )}
      <Annotation
        x={x(highlight.years)}
        y={y(highlight.totalInterest)}
        dx={highlight.years > 75 ? -12 : 12}
        dy={highlight.years > 75 ? 34 : -40}
        label={`${highlight.years}-year: ${formatUSDWhole(highlight.totalInterest)}`}
        align={highlight.years > 75 ? 'end' : 'start'}
        tone="mark"
      />
      <Annotation
        x={x(MIN_YEARS + 2)}
        y={y(loan)}
        dx={6}
        dy={-24}
        label={`The loan itself: ${formatUSDWhole(loan)}`}
        align="start"
        tone="ink"
      />

      <VMarker x={highlight.years} xScale={x} />

      <HoverProbe
        data={points}
        x={(d: TermPoint) => d.years}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${Math.round(v)}-year loan`}
        series={[
          {
            label: 'Total interest',
            color: 'var(--c-accent)',
            y: (d: TermPoint) => d.totalInterest,
            format: formatUSDWhole,
          },
          {
            label: 'Monthly P&I',
            color: 'var(--c-series-3)',
            y: (d: TermPoint) => d.payment,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
