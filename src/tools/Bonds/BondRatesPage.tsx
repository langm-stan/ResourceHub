import { useMemo, useState } from 'react'
import { Callout, Card, ScenarioChip, Slider, Stat, StepHeader } from '../../design-system'
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { priceBond, priceCurve, rateRange } from './compute'
import styles from './BondsPage.module.css'

/*
 * Bonds and Interest Rates: buy a bond at par, then move the market rate.
 * The price walks the curve in the opposite direction, and the longer the
 * bond, the steeper the curve. Defaults reproduce the lecture's Silicon
 * Valley Bank case: 2% Treasuries, rates at 4.8%, nine years left, $797.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'
const PAR = 1000

interface Preset {
  label: string
  coupon: number
  rate: number
  years: number
}

const PRESETS: Preset[] = [
  { label: 'Silicon Valley Bank: 2% Treasuries, rates jump to 4.8%', coupon: 2, rate: 4.8, years: 9 },
  { label: 'A gentler rise: 4% bond, rates go to 5%', coupon: 4, rate: 5, years: 10 },
  { label: 'Rates fall: 4% bond, rates drop to 2%', coupon: 4, rate: 2, years: 10 },
]

const fmtMoney = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function BondRatesPage({ intro = true }: { intro?: boolean } = {}) {
  const [coupon, setCoupon] = useState(2)
  const [rate, setRate] = useState(4.8)
  const [years, setYears] = useState(9)

  const applyPreset = (p: Preset) => {
    setCoupon(p.coupon)
    setRate(p.rate)
    setYears(p.years)
  }
  const presetActive = (p: Preset) => p.coupon === coupon && p.rate === rate && p.years === years

  // The bond was bought at par, so its coupon equals the old market rate.
  // The shock reprices the same cash flows at the new rate, semiannually.
  const quote = useMemo(() => priceBond(PAR, coupon, 2, years, rate), [coupon, years, rate])
  const pct = (quote.price / PAR - 1) * 100
  const oneYear = useMemo(() => priceBond(PAR, coupon, 2, 1, rate), [coupon, rate])
  const oneYearPct = (oneYear.price / PAR - 1) * 100
  const falling = rate > coupon

  // Figure 1: the price-vs-rate curve for a short, your, and a long maturity.
  const rates = useMemo(() => rateRange(0.5, 12, 0.25), [])
  const curves = useMemo(
    () => ({
      short: priceCurve(PAR, coupon, 2, 1, rates),
      yours: priceCurve(PAR, coupon, 2, years, rates),
      long: priceCurve(PAR, coupon, 2, 30, rates),
    }),
    [coupon, years, rates],
  )
  const y1Max = Math.max(...curves.long, ...curves.yours, PAR) * 1.03

  // Figure 2: the same shock across every remaining maturity.
  const maturities = useMemo(() => {
    const out: number[] = []
    for (let y = 0.5; y <= 30; y += 0.5) out.push(y)
    return out
  }, [])
  const byMaturity = useMemo(
    () => maturities.map((y) => priceBond(PAR, coupon, 2, y, rate).price),
    [maturities, coupon, rate],
  )
  const y2Max = Math.max(...byMaturity, PAR) * 1.03

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Investing in financial markets</p>
          <h1 className={styles.h1}>Bonds and Interest Rates</h1>
          <p className={styles.lead}>
            Buy a bond at par, then let the market rate move. Prices go the other way, and the
            longer the bond, the harder they swing.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.stack}>
        <StepHeader
          title="A bond bought at par, then a rate move"
          hint="The coupon was the market rate on the day you bought. Move today's rate and see what your bond is worth now."
        />

        <div className={styles.chipsRow}>
          {PRESETS.map((p) => (
            <ScenarioChip key={p.label} label={p.label} active={presetActive(p)} onClick={() => applyPreset(p)} />
          ))}
        </div>

        <div className={styles.controlsRow}>
          <Slider
            label="Coupon rate (the rate when you bought)"
            value={coupon}
            onChange={setCoupon}
            min={0.5}
            max={10}
            step={0.25}
            editable
            suffix="%"
            precision={2}
          />
          <Slider
            label="Market rate today"
            value={rate}
            onChange={setRate}
            min={0.5}
            max={12}
            step={0.1}
            editable
            suffix="%"
            precision={1}
          />
          <Slider
            label="Years remaining"
            value={years}
            onChange={setYears}
            min={1}
            max={30}
            step={1}
            editable
            suffix={years === 1 ? 'yr' : 'yrs'}
          />
        </div>

        <div className={styles.stats}>
          <Stat
            label="Your bond is now worth"
            value={quote.price}
            format={(v) => fmtMoney(v)}
            emphasis
            accentColor={pct < -0.05 ? RED : pct > 0.05 ? GREEN : undefined}
            note={`${fmtPct(pct)} versus the $1,000 you paid`}
            animate={false}
          />
          <Stat
            label="You bought it at"
            value={PAR}
            format={() => '$1,000'}
            note={`par, when the market rate was ${coupon}%`}
            animate={false}
          />
          <Stat
            label="A 1-year bond instead"
            value={oneYear.price}
            format={(v) => fmtMoney(v)}
            accentColor={GOLD}
            note={`${fmtPct(oneYearPct)}: short bonds barely move`}
            animate={false}
          />
        </div>

        <Callout tone="mark" label="What happened to Silicon Valley Bank">
          In 2023 the bank held ten-year Treasuries bought at par with 2% coupons. A year later the
          market rate was 4.8%, and each $1,000 bond with nine years left was worth about $797, a
          fifth less. Nothing defaulted: old bonds with low coupons simply sell for less when new
          bonds pay more.
        </Callout>

        <StepHeader
          title="The longer the bond, the steeper the curve"
          hint="All three bonds cross par at the coupon rate. They part ways as the rate moves."
        />
        <div className={styles.legend}>
          <span style={{ color: GREEN }}>&#9632; 1-year bond</span>
          <span style={{ color: RED }}>&#9632; your {years}-year bond</span>
          <span style={{ color: GOLD }}>&#9476; 30-year bond</span>
        </div>
        <StationChart
          x={rates}
          yMax={y1Max}
          lines={[
            { ys: curves.long, color: GOLD, width: 2, dashed: true, label: '30-year bond' },
            { ys: curves.short, color: GREEN, width: 2, label: '1-year bond' },
            { ys: curves.yours, color: RED, width: 3, label: `Your ${years}-year bond` },
          ]}
          yRef={PAR}
          refLabel="Par"
          xRef={rate}
          xRefLabel={`Today's rate ${rate}%`}
          xTickFormat={(v) => `${Math.round(v)}%`}
          xHoverLabel={(v) => `Market rate ${v.toFixed(2)}%`}
          ratio={0.42}
          maxHeight={460}
          figure="Figure 1."
          caption={`Every curve passes through par at the ${coupon}% coupon rate. At today's ${rate}% the 1-year bond is worth ${fmtMoney(oneYear.price)} and your ${years}-year bond ${fmtMoney(quote.price)}: same coupon, different exposure.`}
          ariaLabel="Bond prices across market rates for one-year, chosen, and thirty-year maturities"
          exportStats={[
            { label: `Your ${years}-year bond`, value: fmtMoney(quote.price), color: RED },
            { label: '1-year bond', value: fmtMoney(oneYear.price), color: GREEN },
            { label: 'Change', value: fmtPct(pct), color: pct < 0 ? RED : GREEN },
          ]}
        />

        <StepHeader
          title="The same rate move, at every maturity"
          hint="Hold the shock fixed and vary only how long the bond has left."
        />
        <StationChart
          x={maturities}
          yMax={y2Max}
          lines={[{ ys: byMaturity, color: RED, width: 3, label: 'Price after the move' }]}
          yRef={PAR}
          refLabel="Par"
          xRef={years}
          xRefLabel={`Your bond: ${years} yrs`}
          xTickFormat={(v) => `${Math.round(v)} yrs`}
          xHoverLabel={(v) => `${v} years remaining`}
          ratio={0.42}
          maxHeight={460}
          figure="Figure 2."
          caption={
            falling
              ? `With the market at ${rate}%, a ${coupon}% bond loses more the longer it has left to run. At ${years} years the price is ${fmtMoney(quote.price)} (${fmtPct(pct)}).`
              : rate === coupon
                ? 'With the market rate equal to the coupon, every maturity sits exactly at par.'
                : `With the market at ${rate}%, a ${coupon}% coupon is a prize, and it is a prize for longer on a long bond: at ${years} years the price is ${fmtMoney(quote.price)} (${fmtPct(pct)}).`
          }
          ariaLabel="Price of the bond after the rate move, by years remaining to maturity"
          exportStats={[
            { label: `At ${years} years`, value: fmtMoney(quote.price), color: RED },
            { label: 'Change', value: fmtPct(pct), color: pct < 0 ? RED : GREEN },
            { label: 'Par', value: '$1,000' },
          ]}
        />

        <Callout tone="mark" label="Maturity is the multiplier">
          A rising-rate environment punishes long bonds most, which is why skewing short limits
          losses. The trade is that short bonds pay less. Matching the bond&rsquo;s maturity to when
          you need the money back is the practical defense.
        </Callout>
        <Callout tone="note" label="Priced with the same equation">
          Every point on these curves is the Pricing a Bond calculation: the same promised payments,
          discounted at a different market rate. Coupons here are paid semiannually, like Treasuries.
        </Callout>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Prices are the present value of
        the remaining semiannual cash flows per $1,000 of face value; the Silicon Valley Bank
        preset reproduces the lecture&rsquo;s case study.
      </p>
    </div>
  )
}
