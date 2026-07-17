import { useMemo, useState } from 'react'
import { Callout, Card, SegmentedControl, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared chart canvas from the lesson family.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { NEW_APR, USED_APR, carValue, dealPath, fastPayoffMonths } from './compute'
import styles from './UsedVsNewPage.module.css'

/*
 * Used vs. New: the same model bought new or a few years old. The used loan
 * carries the worse rate and still wins on price, because the first owner
 * already paid the steep part of the depreciation curve.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'

type Pick = 'new' | 'used'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function UsedVsNewPage({ intro = true }: { intro?: boolean } = {}) {
  const [price, setPrice] = useState(40000)
  const [age, setAge] = useState(3)
  // null = follow the depreciation curve; a number = a real listing price typed in.
  const [listing, setListing] = useState<number | null>(null)
  // Rates in percent, defaulting to the Experian market averages.
  const [newRate, setNewRate] = useState(Math.round(NEW_APR * 10000) / 100)
  const [usedRate, setUsedRate] = useState(Math.round(USED_APR * 10000) / 100)
  const [months, setMonths] = useState(60)
  const [pick, setPick] = useState<Pick>('new')

  const curveUsed = carValue(price, age)
  const usedPaid = listing != null ? Math.min(listing, price) : curveUsed
  const aprNew = newRate / 100
  const aprUsed = usedRate / 100

  const deals = useMemo(
    () => ({
      new: dealPath(price, 0, aprNew, months),
      used: dealPath(price, age, aprUsed, months, usedPaid),
    }),
    [price, age, aprNew, aprUsed, months, usedPaid]
  )
  const d = deals[pick]
  const fastMonths = useMemo(
    () => fastPayoffMonths(deals.used.pricePaid, aprUsed, deals.new.payment),
    [deals, aprUsed]
  )
  const yMax = Math.max(...d.value, ...d.balance) * 1.1

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Cars and big-ticket items</p>
          <h1 className={styles.h1}>Used vs. New</h1>
          <p className={styles.lead}>
            The same model financed new or a few years old: the payment, the interest, and the
            months the loan exceeds the car&rsquo;s value.
          </p>
        </header>
      )}

      <Card tone="raised">
        <div className={styles.grid}>
          <div className={styles.controlsCol}>
            <p className={styles.lede}>
              Use the defaults or numbers from real listings. Nothing down on either loan.
            </p>
            <Slider
              label="Price new"
              value={price}
              onChange={setPrice}
              min={20000}
              max={80000}
              step={1000}
              editable
              prefix="$"
            />
            <Slider
              label="Age of the used one"
              value={age}
              onChange={setAge}
              min={1}
              max={8}
              step={1}
              editable
              suffix={age > 1 ? 'yrs' : 'yr'}
            />
            <Slider
              label="Price used"
              value={Math.round(usedPaid)}
              onChange={setListing}
              min={5000}
              max={price}
              step={500}
              editable
              prefix="$"
              note={
                listing == null
                  ? 'The curve’s estimate. Type a real listing price to replace it.'
                  : `The curve’s estimate for a ${age}-year-old: ${formatUSDWhole(curveUsed)}.`
              }
            />
            <Slider
              label="Rate on the new loan"
              value={newRate}
              onChange={setNewRate}
              min={0}
              max={20}
              step={0.05}
              editable
              suffix="%"
              precision={2}
            />
            <Slider
              label="Rate on the used loan"
              value={usedRate}
              onChange={setUsedRate}
              min={0}
              max={20}
              step={0.05}
              editable
              suffix="%"
              precision={2}
            />
            <Slider
              label="Loan term"
              value={months}
              onChange={setMonths}
              min={36}
              max={84}
              step={12}
              editable
              suffix="months"
            />
            <div className={styles.stats}>
              <Stat
                label={`New at ${newRate.toFixed(2)}%`}
                value={deals.new.payment}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={GOLD}
                animate={false}
              />
              <Stat
                label={`Used at ${usedRate.toFixed(2)}%`}
                value={deals.used.payment}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={GREEN}
                emphasis
                animate={false}
              />
              <Stat
                label="Interest, new vs. used"
                value={deals.new.totalInterest}
                format={(v) => `${formatUSDWhole(v)} vs. ${formatUSDWhole(deals.used.totalInterest)}`}
                animate={false}
              />
            </div>
            <p className={styles.note}>
              {fastMonths != null ? (
                <>
                  At the new car&rsquo;s {formatUSDWhole(deals.new.payment)} payment, the used
                  loan ends in {fastMonths} months instead of {months}.
                </>
              ) : (
                <>
                  At the new car&rsquo;s {formatUSDWhole(deals.new.payment)} payment, this used
                  loan would still not be paid off after 30 years; at {usedRate.toFixed(2)}%,
                  essentially the whole payment goes to interest.
                </>
              )}
            </p>
          </div>

          <div className={styles.chartCol}>
            <SegmentedControl
              label="Show the loan on"
              options={[
                { value: 'new', label: `The new one (${formatUSDWhole(deals.new.pricePaid)})` },
                { value: 'used', label: `The used one (${formatUSDWhole(deals.used.pricePaid)})` },
              ]}
              value={pick}
              onChange={setPick}
            />
            <div className={styles.legend}>
              <span style={{ color: GOLD }}>&#9632; what the car is worth</span>
              <span style={{ color: RED }}>&#9632; what you still owe</span>
            </div>
            <StationChart
              x={d.x}
              yMax={yMax}
              lines={[
                { ys: d.balance, color: RED, width: 3, label: 'Loan balance' },
                { ys: d.value, color: GOLD, width: 3, label: 'Car value' },
              ]}
              xTickFormat={(v) => `${Math.round(v)} yr`}
              xHoverLabel={(v) => `Car age ${v.toFixed(1)} yrs`}
              figure="Figure 1."
              caption={
                pick === 'new'
                  ? `Bought new: the loan exceeds the car's value for ${deals.new.underwaterMonths} months at these settings.`
                  : `Bought at ${age} year${age > 1 ? 's' : ''} old: the loan exceeds the car's value for ${deals.used.underwaterMonths} months at these settings.`
              }
              ariaLabel="Loan balance versus car value over the life of the loan"
              exportStats={[
                { label: 'Payment', value: `${formatUSDWhole(d.payment)}/mo` },
                { label: 'Total interest', value: formatUSDWhole(d.totalInterest), color: RED },
                { label: 'Months underwater', value: `${d.underwaterMonths}`, color: d.underwaterMonths > 0 ? RED : GREEN },
              ]}
            />
            <Callout tone="mark" label="Why the interest totals come out close">
              At the defaults, the totals are nearly equal: more borrowed at a lower rate, less at
              a higher one. The real difference is the price paid, traded against repair risk and
              a shorter warranty.
            </Callout>
          </div>
        </div>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Depreciation: about 20% in year
        one, 15% a year after (Kelley Blue Book; varies by model). Default rates: Experian Q4 2025
        averages. Nothing down.
      </p>
    </div>
  )
}
