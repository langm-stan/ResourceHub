import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  ScenarioChip,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
} from '../../design-system'
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { priceBond, priceCurve, rateRange } from './compute'
import styles from './BondsPage.module.css'

/*
 * Pricing a Bond: the lecture's cash-flow diagrams made live. Set the
 * coupon, the maturity, and the market rate; the timeline shows the stream
 * of payments the bond owes, and the curve shows the same bond's price at
 * every market rate, crossing par exactly at the coupon rate.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'

interface Preset {
  label: string
  face: number
  coupon: number
  perYear: number
  years: number
  market: number
}

/* The lecture's own bonds: slides 29, 23, 27, and the slide 21 T-bill. */
const PRESETS: Preset[] = [
  { label: '5-year 6% bond at a 7% market rate', face: 1000, coupon: 6, perYear: 1, years: 5, market: 7 },
  { label: '10-year Treasury, 6% semiannual, at 7%', face: 1000, coupon: 6, perYear: 2, years: 10, market: 7 },
  { label: '15-year corporate, 4% quarterly, at 5%', face: 1000, coupon: 4, perYear: 4, years: 15, market: 5 },
  { label: '6-month T-bill at 3%: no coupons', face: 1000, coupon: 0, perYear: 1, years: 0.5, market: 3 },
]

const fmtMoney = (v: number) =>
  Math.abs(v - Math.round(v)) < 0.005
    ? `$${Math.round(v).toLocaleString()}`
    : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function BondPricingPage({ intro = true }: { intro?: boolean } = {}) {
  const [face, setFace] = useState(1000)
  const [coupon, setCoupon] = useState(6)
  const [perYear, setPerYear] = useState(1)
  const [years, setYears] = useState(5)
  const [market, setMarket] = useState(7)

  const applyPreset = (p: Preset) => {
    setFace(p.face)
    setCoupon(p.coupon)
    setPerYear(p.perYear)
    setYears(p.years)
    setMarket(p.market)
  }
  const presetActive = (p: Preset) =>
    p.face === face && p.coupon === coupon && p.perYear === perYear && p.years === years && p.market === market

  const quote = useMemo(() => priceBond(face, coupon, perYear, years, market), [face, coupon, perYear, years, market])

  const standing = market > coupon ? 'discount' : market < coupon ? 'premium' : 'par'
  const standingNote =
    standing === 'par'
      ? 'the market rate equals the coupon rate'
      : standing === 'discount'
        ? `below par: the market's ${market}% beats the ${coupon}% coupon`
        : `above par: the ${coupon}% coupon beats the market's ${market}%`

  // The cash-flow timeline: what you pay today, then every payment the bond owes.
  const periodLabel = (k: number) =>
    quote.zero
      ? years < 1
        ? `${Math.round(years * 12)} mo`
        : `Yr ${years}`
      : perYear === 1
        ? `Yr ${k}`
        : perYear === 2
          ? `Yr ${k / 2}`
          : `Q${k}`
  const nodes: { amount: string; period: string; kind: 'today' | 'coupon' | 'final' | 'ellipsis' }[] = [
    { amount: `You pay ${fmtMoney(quote.price)}`, period: 'Today', kind: 'today' },
  ]
  if (quote.zero) {
    nodes.push({ amount: fmtMoney(face), period: periodLabel(0), kind: 'final' })
  } else {
    const finalNode = { amount: fmtMoney(quote.pmt + face), period: periodLabel(quote.n), kind: 'final' as const }
    if (quote.n <= 7) {
      for (let k = 1; k < quote.n; k++) nodes.push({ amount: fmtMoney(quote.pmt), period: periodLabel(k), kind: 'coupon' })
      nodes.push(finalNode)
    } else {
      for (let k = 1; k <= 4; k++) nodes.push({ amount: fmtMoney(quote.pmt), period: periodLabel(k), kind: 'coupon' })
      nodes.push({ amount: '…', period: '', kind: 'ellipsis' })
      nodes.push(finalNode)
    }
  }

  // The same bond's price at every market rate: the lecture's slide 31 curve.
  const rates = useMemo(() => rateRange(0.5, 15, 0.25), [])
  const curve = useMemo(() => priceCurve(face, coupon, perYear, years, rates), [face, coupon, perYear, years, rates])
  const yMax = Math.max(...curve, face) * 1.05

  const perYearLabel = perYear === 1 ? 'once a year' : perYear === 2 ? 'every six months' : 'every quarter'

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Investing in financial markets</p>
          <h1 className={styles.h1}>Pricing a Bond</h1>
          <p className={styles.lead}>
            A bond is a loan: set the coupon, the maturity, and the market rate, then price the
            stream of payments the borrower has promised.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.stack}>
        <StepHeader
          title="The stream of payments"
          hint="Set the bond's terms. The price is what the promised payments are worth today at the market rate."
        />

        <div className={styles.chipsRow}>
          {PRESETS.map((p) => (
            <ScenarioChip key={p.label} label={p.label} active={presetActive(p)} onClick={() => applyPreset(p)} />
          ))}
        </div>

        <SegmentedControl
          label="Coupons paid"
          options={[
            { value: '1', label: 'Annually' },
            { value: '2', label: 'Semiannually' },
            { value: '4', label: 'Quarterly' },
          ]}
          value={String(perYear)}
          onChange={(v) => setPerYear(Number(v))}
        />
        <div className={styles.controlsRow}>
          <Slider
            label="Face value"
            value={face}
            onChange={setFace}
            min={100}
            max={10000}
            step={100}
            editable
            inputMax={1000000}
            prefix="$"
          />
          <Slider
            label="Coupon rate"
            value={coupon}
            onChange={setCoupon}
            min={0}
            max={12}
            step={0.25}
            editable
            suffix="%"
            precision={2}
          />
          <Slider
            label="Years to maturity"
            value={years}
            onChange={setYears}
            min={0.5}
            max={30}
            step={0.5}
            editable
            precision={1}
            suffix={years === 1 ? 'yr' : 'yrs'}
          />
          <Slider
            label="Market rate"
            value={market}
            onChange={setMarket}
            min={0}
            max={15}
            step={0.25}
            editable
            suffix="%"
            precision={2}
          />
        </div>

        <div className={styles.stats}>
          <Stat
            label="Price today"
            value={quote.price}
            format={(v) => fmtMoney(v)}
            emphasis
            accentColor={standing === 'discount' ? RED : standing === 'premium' ? GREEN : undefined}
            note={standingNote}
            animate={false}
          />
          {!quote.zero && (
            <Stat
              label="Each coupon"
              value={quote.pmt}
              format={(v) => fmtMoney(v)}
              note={`${perYearLabel}, ${quote.n} payments in all`}
              animate={false}
            />
          )}
          <Stat
            label="At maturity"
            value={quote.zero ? face : quote.pmt + face}
            format={(v) => fmtMoney(v)}
            note={quote.zero ? 'the face value, all at once' : 'the last coupon plus the face value'}
            animate={false}
          />
        </div>

        <div>
          <div className={styles.timeline} role="img" aria-label="The bond's cash flows: the price paid today and each payment received">
            {nodes.map((node, idx) => (
              <div key={idx} className={styles.node}>
                <span
                  className={
                    node.kind === 'today'
                      ? styles.amountToday
                      : node.kind === 'final'
                        ? styles.amountFinal
                        : node.kind === 'ellipsis'
                          ? styles.amountEllipsis
                          : styles.amount
                  }
                >
                  {node.amount}
                </span>
                <span
                  className={
                    node.kind === 'today'
                      ? `${styles.rail} ${styles.railToday}`
                      : node.kind === 'final'
                        ? `${styles.rail} ${styles.railFinal}`
                        : node.kind === 'ellipsis'
                          ? `${styles.rail} ${styles.railEllipsis}`
                          : styles.rail
                  }
                />
                <span className={styles.period}>{node.period}</span>
              </div>
            ))}
          </div>
          <p className={styles.timelineCaption}>
            <strong>Figure 1.</strong>{' '}
            {quote.zero
              ? `A zero-coupon bill: pay ${fmtMoney(quote.price)} today, receive ${fmtMoney(face)} at maturity. The ${fmtMoney(face - quote.price)} difference is the discount interest.`
              : `Pay ${fmtMoney(quote.price)} today for ${fmtMoney(quote.pmt)} ${perYearLabel} and the face value back at maturity.`}
          </p>
        </div>

        {quote.zero ? (
          <Callout tone="mark" label="This is how T-bills work">
            Treasury bills make no coupon payments. They sell at a discount, and the interest is the
            gap between the price and the face value. Bidders at the Treasury&rsquo;s auction name the
            price that gives them the return they want.
          </Callout>
        ) : (
          <Callout tone="mark" label="Two rates, two jobs">
            The coupon rate sets the payments and never changes. The market rate prices them, and it
            changes all the time. A bond sells below par exactly when the market rate is above the
            coupon rate.
          </Callout>
        )}

        <StepHeader
          title="The same bond at every market rate"
          hint="Slide the market rate and watch the price walk along this curve."
        />
        <StationChart
          x={rates}
          yMax={yMax}
          lines={[{ ys: curve, color: RED, width: 3, label: 'Price of this bond' }]}
          yRef={face}
          refLabel="Par (face value)"
          xRef={market}
          xRefLabel={`Market rate ${market}%`}
          xTickFormat={(v) => `${Math.round(v)}%`}
          xHoverLabel={(v) => `Market rate ${v.toFixed(2)}%`}
          ratio={0.42}
          maxHeight={460}
          figure="Figure 2."
          caption={
            quote.zero
              ? `The higher the rate, the less ${fmtMoney(face)} at maturity is worth today. Prices and rates move in opposite directions.`
              : `The price falls as the market rate rises, and the curve crosses par exactly at the ${coupon}% coupon rate. At ${market}% this bond is worth ${fmtMoney(quote.price)}.`
          }
          ariaLabel="Price of the bond across market interest rates"
          exportStats={[
            { label: 'Price at the market rate', value: fmtMoney(quote.price), color: RED },
            { label: 'Par', value: fmtMoney(face) },
            { label: 'Coupon rate', value: `${coupon}%` },
          ]}
        />

        <StepHeader title="The math" hint="Price the coupons as an annuity and the face value as a lump sum." />
        <FormulaBlock
          tex={`P \\;=\\; PMT \\cdot \\frac{1 - (1+i)^{-N}}{i} \\;+\\; \\frac{FV}{(1+i)^{N}} \\;=\\; ${fmtMoney(quote.price).replace('$', '\\$')}`}
          caption={
            quote.zero
              ? `With no coupons the first term vanishes: the price is the face value discounted at the market rate for ${years} ${years === 1 ? 'year' : 'years'}.`
              : `i is the market rate per period (${market}% ÷ ${perYear} = ${(quote.perPeriodRate * 100).toFixed(2)}%); N is the ${quote.n} payments; PMT is the ${fmtMoney(quote.pmt)} coupon.`
          }
        />
        <Callout tone="note" label="The same five keys">
          On the TVM calculator: N = {quote.zero ? years : quote.n}, I/Y ={' '}
          {(quote.perPeriodRate * 100).toFixed(2)}, PMT = {quote.zero ? 0 : Math.round(quote.pmt)},
          FV = {face.toLocaleString()}; solve for PV. The price is what you give up today.
        </Callout>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Coupon bonds discount each
        payment at the market rate per period; the zero-coupon bill uses annual compounding,
        matching the lecture&rsquo;s T-bill auction example. The presets are the lecture&rsquo;s own
        bonds.
      </p>
    </div>
  )
}
