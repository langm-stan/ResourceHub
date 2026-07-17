import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
} from '../../design-system'
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
import { usePersistentState } from '../../hooks/usePersistentState'
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
const GREEN = 'var(--c-series-1)'
const VIOLET = 'var(--c-series-5)'

/*
 * Where the money sits while prices rise. Rates are long-run U.S. nominal
 * averages (stocks: large-cap total return since 1926; bonds: long
 * government bonds; savings: recent national average deposit rate), fixed
 * here so the comparison stays vetted rather than adjustable.
 */
type VehicleKey = 'cash' | 'savings' | 'bonds' | 'stocks'
const VEHICLES: { key: VehicleKey; label: string; short: string; rate: number; color: string }[] = [
  { key: 'cash', label: 'Cash', short: 'Cash', rate: 0, color: SLATE },
  { key: 'savings', label: 'Savings account', short: 'Savings', rate: 0.5, color: AMBER },
  { key: 'bonds', label: 'Bonds', short: 'Bonds', rate: 5, color: VIOLET },
  { key: 'stocks', label: 'Stocks', short: 'Stocks', rate: 10, color: GREEN },
]

interface Point {
  t: number
  /** Price at the visitor's rate, then one per reference rate. */
  user: number
  refs: number[]
}

interface OutrunPoint {
  t: number
  /** The invested money's balance. */
  balance: number
  /** What the same purchase costs by then. */
  cost: number
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
  // Values persist in localStorage so navigating away and back keeps them.
  const [price, setPrice] = usePersistentState('ifdm-inflation-price', 100)
  const [rate, setRate] = usePersistentState('ifdm-inflation-rate', 2)
  const [years, setYears] = usePersistentState('ifdm-inflation-years', 30)
  const [vehicleKey, setVehicleKey] = usePersistentState<VehicleKey>(
    'ifdm-inflation-vehicle',
    'savings',
    (v) => VEHICLES.some((x) => x.key === v),
  )

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

  const vehicle = VEHICLES.find((v) => v.key === vehicleKey)!

  // The head-to-head race: the invested balance compounds at the vehicle's
  // rate while the price of the same purchase compounds at the inflation rate.
  const outrun = useMemo(() => {
    const points: OutrunPoint[] = []
    for (let t = 0; t <= years; t++) {
      points.push({
        t,
        balance: price * Math.pow(1 + vehicle.rate / 100, t),
        cost: price * Math.pow(1 + rate / 100, t),
      })
    }
    return points
  }, [price, rate, years, vehicle])

  const finalPrice = price * Math.pow(1 + rate / 100, years)
  const finalBuys = price / Math.pow(1 + rate / 100, years)
  const doubling = rate > 0 ? Math.log(2) / Math.log(1 + rate / 100) : null

  const vehicleBalance = price * Math.pow(1 + vehicle.rate / 100, years)
  const vehicleBuys = vehicleBalance / Math.pow(1 + rate / 100, years)
  const outruns = vehicle.rate > rate

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Inflation</p>
          <h1 className={styles.h1}>How inflation affects prices and purchasing power</h1>
          <p className={styles.lead}>
            Inflation compounds the way interest does. Choose a rate and a time horizon to see
            what prices become and what a fixed amount of money still buys.
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
              The Federal Reserve targets 2%; the long-run U.S. average is about 3%; the June 2022
              peak was 9%.
            </p>
          </div>
        </aside>

        <div className={styles.main}>
          <Card tone="raised">
            <StepHeader
              title="Prices over time"
              hint="The same purchase at four inflation rates. Prices compound like interest."
            />
            <div className={styles.stats}>
              <Stat
                label={`Cost in ${years} years`}
                value={finalPrice}
                format={formatUSDWhole}
                emphasis
                accentColor={CARDINAL}
              />
              <Stat label="Cost today" value={price} format={formatUSDWhole} />
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
              caption={`A ${formatUSDWhole(price)} purchase at your rate and at ${REF_RATES.map((r) => `${r}%`).join(', ')}.`}
              ariaLabel="Price of the same purchase over time at different inflation rates"
              exportStats={[
                { label: 'Cost today', value: formatUSDWhole(price) },
                { label: `At ${rate}% in ${years} years`, value: formatUSDWhole(finalPrice), color: CARDINAL },
              ]}
            />
            <p className={styles.takeaway}>
              At {rate}% inflation, a {formatUSDWhole(price)} purchase costs{' '}
              <strong>{formatUSDWhole(finalPrice)}</strong> in {years} years.
            </p>
          </Card>

          <Card tone="raised">
            <StepHeader
              title="Purchasing power over time"
              hint="A fixed amount of money buys less each year."
            />
            <div className={styles.stats}>
              <Stat
                label={`Purchasing power in ${years} years`}
                value={finalBuys}
                format={formatUSDWhole}
                emphasis
                accentColor={AMBER}
              />
              <Stat
                label="Purchasing power lost"
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
              caption={`The purchasing power of ${formatUSDWhole(price)}, in today's prices.`}
              ariaLabel="Purchasing power of a fixed amount of money over time at different inflation rates"
              exportStats={[
                { label: 'Today', value: formatUSDWhole(price) },
                { label: `At ${rate}% in ${years} years`, value: formatUSDWhole(finalBuys), color: AMBER },
              ]}
            />
            <FormulaBlock
              tex={`P_{t} = \\frac{P_0}{(1+\\pi)^{t}} = \\frac{${texUSD(price)}}{(1 + ${texNumber(rate / 100, 3)})^{${years}}} = \\boxed{${texUSD(finalBuys)}}`}
              caption="The compound interest formula in reverse, with π the inflation rate: dividing by the price growth gives purchasing power."
              muted
            />
          </Card>

          <Card tone="raised">
            <StepHeader
              title="Does your investment strategy beat inflation?"
              hint="The balance compounds at its rate of return, the price at your inflation rate. Purchasing power is preserved only above the price line."
            />
            <div className={styles.vehicleRow}>
              <SegmentedControl
                label="Investment strategy"
                options={VEHICLES.map((v) => ({ value: v.key, label: v.label }))}
                value={vehicleKey}
                onChange={setVehicleKey}
              />
            </div>
            <div className={styles.stats}>
              <Stat
                label="Value in today's dollars"
                value={vehicleBuys}
                format={formatUSDWhole}
                emphasis
                accentColor={outruns ? GREEN : CARDINAL}
              />
              <Stat
                label={`Balance in ${years} years`}
                value={vehicleBalance}
                format={formatUSDWhole}
                accentColor={vehicle.color}
              />
              <Stat
                label="Price of the purchase"
                value={finalPrice}
                format={formatUSDWhole}
                accentColor={CARDINAL}
              />
            </div>
            <OutrunChart
              points={outrun}
              years={years}
              rate={rate}
              vehicle={vehicle}
              caption={`${formatUSDWhole(price)} in ${vehicle.label.toLowerCase()} (${vehicle.rate}% per year) versus the same purchase at ${rate}% inflation. Returns are long-run U.S. averages.`}
              ariaLabel="An invested balance compared with the rising price of the same purchase"
              exportStats={[
                { label: vehicle.label, value: formatUSDWhole(vehicleBalance), color: vehicle.color },
                { label: 'Price of the purchase', value: formatUSDWhole(finalPrice), color: CARDINAL },
                {
                  label: 'Value in today’s dollars',
                  value: formatUSDWhole(vehicleBuys),
                  color: outruns ? GREEN : CARDINAL,
                },
              ]}
            />
            <p className={styles.takeaway}>
              {outruns ? (
                <>
                  A {vehicle.rate}% return exceeds {rate}% inflation: the{' '}
                  <strong>{formatUSDWhole(vehicleBalance)}</strong> balance is worth{' '}
                  <strong>{formatUSDWhole(vehicleBuys)}</strong> in today&rsquo;s dollars.
                </>
              ) : vehicle.rate === rate ? (
                <>
                  A {vehicle.rate}% return keeps pace with {rate}% inflation exactly: the{' '}
                  <strong>{formatUSDWhole(vehicleBalance)}</strong> balance is worth{' '}
                  <strong>{formatUSDWhole(vehicleBuys)}</strong> in today&rsquo;s dollars, the same
                  purchasing power you started with.
                </>
              ) : (
                <>
                  A {vehicle.rate}% return trails {rate}% inflation: the{' '}
                  <strong>{formatUSDWhole(vehicleBalance)}</strong> balance is worth only{' '}
                  <strong>{formatUSDWhole(vehicleBuys)}</strong> in today&rsquo;s dollars.
                </>
              )}
            </p>
            <Callout tone="note" label="The implication for savers">
              Savings build real wealth only when the rate of return exceeds inflation.
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

type Vehicle = (typeof VEHICLES)[number]

function OutrunChart({
  points,
  years,
  rate,
  vehicle,
  caption,
  ariaLabel,
  exportStats,
}: {
  points: OutrunPoint[]
  years: number
  rate: number
  vehicle: Vehicle
  caption: string
  ariaLabel: string
  exportStats: { label: string; value: string; color?: string }[]
}) {
  return (
    <ChartFrame
      ratio={0.5}
      maxHeight={460}
      margin={CHART_MARGIN}
      figure="Figure 3."
      caption={caption}
      ariaLabel={ariaLabel}
      exportStats={exportStats}
    >
      <OutrunLines points={points} years={years} rate={rate} vehicle={vehicle} />
    </ChartFrame>
  )
}

function OutrunLines({
  points,
  years,
  rate,
  vehicle,
}: {
  points: OutrunPoint[]
  years: number
  rate: number
  vehicle: Vehicle
}) {
  const { innerWidth, innerHeight } = useChart()
  const last = points[points.length - 1]!
  const top = Math.max(last.balance, last.cost)
  const x = useMemo(() => scaleLinear().domain([0, years]).range([0, innerWidth]), [years, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, top * 1.04]).range([innerHeight, 0]).nice(),
    [top, innerHeight],
  )

  const dy = spreadLabels([{ y: y(last.balance) }, { y: y(last.cost) }])

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={Math.min(8, years)} format={(v) => (v === 0 ? '0' : `${v}y`)} />
      {/* The gap between the racers, colored by who is ahead. */}
      <AreaSeries
        data={points}
        x={(d: OutrunPoint) => d.t}
        y0={(d: OutrunPoint) => d.cost}
        y1={(d: OutrunPoint) => d.balance}
        xScale={x}
        yScale={y}
        fill={`color-mix(in srgb, ${last.balance >= last.cost ? vehicle.color : CARDINAL} 14%, var(--surface))`}
      />
      <LineSeries
        data={points}
        x={(d: OutrunPoint) => d.t}
        y={(d: OutrunPoint) => d.cost}
        xScale={x}
        yScale={y}
        stroke={CARDINAL}
        width={2}
        dashed
      />
      <LineSeries
        data={points}
        x={(d: OutrunPoint) => d.t}
        y={(d: OutrunPoint) => d.balance}
        xScale={x}
        yScale={y}
        stroke={vehicle.color}
        width={2.5}
        draw
      />
      <EndLabel
        x={x(years)}
        y={y(last.balance)}
        text={vehicle.short}
        color={vehicle.color}
        textDy={dy[0]}
      />
      <EndLabel
        x={x(years)}
        y={y(last.cost)}
        text={`Prices ${rate}%`}
        color={CARDINAL}
        textDy={dy[1]}
      />
      <HoverProbe
        data={points}
        x={(d: OutrunPoint) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 1 ? 'After 1 year' : `After ${Math.round(v)} years`)}
        series={[
          {
            label: vehicle.label,
            color: vehicle.color,
            y: (d: OutrunPoint) => d.balance,
            format: formatUSDWhole,
          },
          {
            label: 'Price of the purchase',
            color: CARDINAL,
            y: (d: OutrunPoint) => d.cost,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
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
