import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { Callout, Card, FormulaBlock, NumberField, Slider, Stat, StepHeader } from '../../design-system'
import {
  AreaSeries,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  EndLabel,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
} from '../../design-system/chart'
import { formatUSDCompact, formatUSDWhole, formatYears, texNumber, texUSD } from '../../lib/format'
import styles from './InflationPage.module.css'

/*
 * Inflation as compounding in reverse: the same exponential curve the
 * Compound Interest tool draws for a balance, applied to a price. Reference
 * lines at fixed rates sit behind the visitor's own rate so the "different
 * rates of inflation" comparison is always on screen.
 */

const REF_RATES = [2, 5, 8]
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'
const AMBER = 'var(--c-series-2)'

interface Point {
  t: number
  /** Price at the visitor's rate, then one per reference rate. */
  user: number
  refs: number[]
}

function priceSeries(price: number, ratePct: number, years: number): Point[] {
  const points: Point[] = []
  for (let t = 0; t <= years; t++) {
    points.push({
      t,
      user: price * Math.pow(1 + ratePct / 100, t),
      refs: REF_RATES.map((r) => price * Math.pow(1 + r / 100, t)),
    })
  }
  return points
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function InflationPage({ intro = true }: { intro?: boolean } = {}) {
  const [price, setPrice] = useState(100)
  const [rate, setRate] = useState(3)
  const [years, setYears] = useState(30)

  const prices = useMemo(() => priceSeries(price, rate, years), [price, rate, years])
  const buying = useMemo(() => {
    const points: Point[] = []
    for (let t = 0; t <= years; t++) {
      points.push({
        t,
        user: price / Math.pow(1 + rate / 100, t),
        refs: REF_RATES.map((r) => price / Math.pow(1 + r / 100, t)),
      })
    }
    return points
  }, [price, rate, years])

  const finalPrice = price * Math.pow(1 + rate / 100, years)
  const finalBuys = price / Math.pow(1 + rate / 100, years)
  const doubling = rate > 0 ? Math.log(2) / Math.log(1 + rate / 100) : null

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Inflation</p>
          <h1 className={styles.h1}>See how inflation raises prices</h1>
          <p className={styles.lead}>
            Prices compound the way interest does. A steady inflation rate does not add the same
            dollar amount each year; it multiplies, so the price curve bends upward. Set a rate and
            a horizon, then watch what today&rsquo;s price becomes and what your money still buys.
          </p>
        </header>
      )}

      <div className={styles.layout}>
        <aside className={styles.rail}>
          <div className={styles.railSticky}>
            <StepHeader title="Set up your scenario" />
            <NumberField
              label="Today's price"
              value={price}
              onChange={setPrice}
              min={1}
              max={1000000}
              prefix="$"
              precision={0}
            />
            <NumberField
              label="Inflation each year"
              value={rate}
              onChange={setRate}
              min={0}
              max={15}
              suffix="%"
              precision={1}
            />
            <Slider
              label="For how long"
              value={years}
              onChange={setYears}
              min={1}
              max={150}
              step={1}
              editable
              suffix="years"
            />
            <p className={styles.railNote}>
              For reference: the Federal Reserve aims for 2% a year, the long-run U.S. average is
              about 3%, and in June 2022 inflation briefly hit 9%.
            </p>
          </div>
        </aside>

        <div className={styles.main}>
          <Card tone="raised">
            <StepHeader
              title="Watch prices rise"
              hint="Every line is the same purchase. A higher inflation rate bends its price upward faster, exactly like a higher interest rate on savings."
            />
            <div className={styles.stats}>
              <Stat
                label={`Costs in ${years} years`}
                value={finalPrice}
                format={formatUSDWhole}
                emphasis
                accentColor={CARDINAL}
              />
              <Stat label="Costs today" value={price} format={formatUSDWhole} />
              {doubling && (
                <Stat
                  label="Prices double about every"
                  value={doubling}
                  format={formatYears}
                  animate={false}
                />
              )}
            </div>
            <PriceChart
              points={prices}
              years={years}
              rate={rate}
              caption={`What something costing ${formatUSDWhole(price)} today costs later, at your rate and at ${REF_RATES.map((r) => `${r}%`).join(', ')} inflation.`}
              ariaLabel="Price of the same purchase over time at different inflation rates"
              exportStats={[
                { label: 'Costs today', value: formatUSDWhole(price) },
                { label: `At ${rate}% in ${years} years`, value: formatUSDWhole(finalPrice), color: CARDINAL },
              ]}
            />
            <p className={styles.takeaway}>
              At {rate}% inflation, what costs {formatUSDWhole(price)} today costs{' '}
              <strong>{formatUSDWhole(finalPrice)}</strong> in {years} years. Nothing about the
              purchase changed; only the number of dollars it takes to make it.
            </p>
          </Card>

          <Card tone="raised">
            <StepHeader
              title="What the same money still buys"
              hint="The flip side: hold the dollars fixed and the goods shrink. This is the curve that matters for cash sitting in a drawer or a zero-interest account."
            />
            <div className={styles.stats}>
              <Stat
                label={`A ${formatUSDWhole(price)} bill in ${years} years buys what this buys today`}
                value={finalBuys}
                format={formatUSDWhole}
                emphasis
                accentColor={AMBER}
              />
              <Stat
                label="Buying power lost"
                value={price - finalBuys}
                format={formatUSDWhole}
                accentColor={CARDINAL}
              />
            </div>
            <BuyingPowerChart
              points={buying}
              years={years}
              rate={rate}
              price={price}
              caption={`The goods a fixed ${formatUSDWhole(price)} still affords, measured in today's prices.`}
              ariaLabel="Buying power of a fixed amount of money over time at different inflation rates"
              exportStats={[
                { label: 'Today', value: formatUSDWhole(price) },
                { label: `At ${rate}% in ${years} years`, value: formatUSDWhole(finalBuys), color: AMBER },
              ]}
            />
            <FormulaBlock
              tex={`P_{t} = P_0 (1+\\pi)^{t} = ${texUSD(price)} \\cdot (1 + ${texNumber(rate / 100, 3)})^{${years}} = \\boxed{${texUSD(finalPrice)}}`}
              caption="The same formula as compound interest, with the inflation rate π in place of the interest rate. Buying power divides by the same factor instead of multiplying."
              muted
            />
            <Callout tone="note" label="Why this matters for saving">
              Money that earns less than inflation loses buying power even while its balance grows.
              If a savings account pays 1% while prices rise 2%, a year later the account holds
              more dollars but buys less. The interest rate has to beat the inflation rate before
              saving makes you able to buy more.
            </Callout>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ---- Charts --------------------------------------------------------------- */

/** Nudge end-label y positions apart so labels never overprint. */
function spreadLabels(entries: { y: number }[], gap = 15): number[] {
  const order = entries
    .map((e, i) => ({ y: e.y, i }))
    .sort((a, b) => a.y - b.y)
  const placed: number[] = []
  const dy = new Array<number>(entries.length).fill(0)
  for (const { y, i } of order) {
    const min = placed.length ? placed[placed.length - 1]! + gap : -Infinity
    const finalY = Math.max(y, min)
    dy[i] = finalY - y
    placed.push(finalY)
  }
  return dy
}

const CHART_MARGIN = { top: 20, right: 88, bottom: 36, left: 64 }

function PriceChart({
  points,
  years,
  rate,
  caption,
  ariaLabel,
  exportStats,
}: {
  points: Point[]
  years: number
  rate: number
  caption: string
  ariaLabel: string
  exportStats: { label: string; value: string; color?: string }[]
}) {
  return (
    <ChartFrame
      ratio={0.5}
      maxHeight={460}
      margin={CHART_MARGIN}
      figure="Figure 1."
      caption={caption}
      ariaLabel={ariaLabel}
      exportStats={exportStats}
    >
      <RateLines points={points} years={years} rate={rate} baseline={0} />
    </ChartFrame>
  )
}

function BuyingPowerChart({
  points,
  years,
  rate,
  price,
  caption,
  ariaLabel,
  exportStats,
}: {
  points: Point[]
  years: number
  rate: number
  price: number
  caption: string
  ariaLabel: string
  exportStats: { label: string; value: string; color?: string }[]
}) {
  return (
    <ChartFrame
      ratio={0.5}
      maxHeight={460}
      margin={CHART_MARGIN}
      figure="Figure 2."
      caption={caption}
      ariaLabel={ariaLabel}
      exportStats={exportStats}
    >
      <RateLines points={points} years={years} rate={rate} max={price} userColor={AMBER} fillUser />
    </ChartFrame>
  )
}

function RateLines({
  points,
  years,
  rate,
  baseline,
  max,
  userColor = CARDINAL,
  fillUser = false,
}: {
  points: Point[]
  years: number
  rate: number
  /** Fix the y-domain floor (prices) instead of deriving it. */
  baseline?: number
  /** Fix the y-domain ceiling (buying power starts at the full amount). */
  max?: number
  userColor?: string
  fillUser?: boolean
}) {
  const { innerWidth, innerHeight } = useChart()
  const last = points[points.length - 1]!
  const top = max ?? Math.max(last.user, ...last.refs)
  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([baseline ?? 0, top * 1.04]).range([innerHeight, 0]).nice(),
    [baseline, top, innerHeight],
  )

  const ends = [
    { y: y(last.user) },
    ...last.refs.map((v) => ({ y: y(v) })),
  ]
  const dy = spreadLabels(ends)

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={Math.min(8, years)} format={(v) => (v === 0 ? '0' : `${v}y`)} />
      {fillUser && (
        <AreaSeries
          data={points}
          x={(d: Point) => d.t}
          y0={() => 0}
          y1={(d: Point) => d.user}
          xScale={x}
          yScale={y}
          fill={`color-mix(in srgb, ${userColor} 18%, var(--surface))`}
        />
      )}
      {REF_RATES.map((r, i) => (
        <LineSeries
          key={r}
          data={points}
          x={(d: Point) => d.t}
          y={(d: Point) => d.refs[i]!}
          xScale={x}
          yScale={y}
          stroke={SLATE}
          width={1.5}
        />
      ))}
      <LineSeries
        data={points}
        x={(d: Point) => d.t}
        y={(d: Point) => d.user}
        xScale={x}
        yScale={y}
        stroke={userColor}
        width={2.5}
        draw
      />
      <EndLabel x={x(years)} y={y(last.user)} text={`Your ${rate}%`} color={userColor} textDy={dy[0]} />
      {REF_RATES.map((r, i) => (
        <EndLabel
          key={r}
          x={x(years)}
          y={y(last.refs[i]!)}
          text={`${r}%`}
          color={SLATE}
          textDy={dy[i + 1]}
        />
      ))}
      <HoverProbe
        data={points}
        x={(d: Point) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 1 ? 'After 1 year' : `After ${Math.round(v)} years`)}
        series={[
          {
            label: `Your ${rate}%`,
            color: userColor,
            y: (d: Point) => d.user,
            format: formatUSDWhole,
          },
          ...REF_RATES.map((r, i) => ({
            label: `${r}%`,
            color: SLATE,
            y: (d: Point) => d.refs[i]!,
            format: formatUSDWhole,
          })),
        ]}
      />
    </>
  )
}
