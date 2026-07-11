import { useMemo, useState } from 'react'
import { Callout, Card, SegmentedControl, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared chart canvas from the lesson family.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { NEW_APR, USED_APR, dealPath, fastPayoffMonths } from './compute'
import styles from './UsedVsNewPage.module.css'

/*
 * Used vs. New: the same model bought new or a few years old. The used loan
 * carries the worse rate and still wins on price, because the first owner
 * already paid the steep part of the depreciation curve.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

type Pick = 'new' | 'used'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function UsedVsNewPage({ intro = true }: { intro?: boolean } = {}) {
  const [price, setPrice] = useState(40000)
  const [age, setAge] = useState(3)
  const [months, setMonths] = useState(60)
  const [pick, setPick] = useState<Pick>('new')

  const deals = useMemo(
    () => ({
      new: dealPath(price, 0, NEW_APR, months),
      used: dealPath(price, age, USED_APR, months),
    }),
    [price, age, months]
  )
  const d = deals[pick]
  const fastMonths = useMemo(
    () => fastPayoffMonths(deals.used.pricePaid, USED_APR, deals.new.payment),
    [deals]
  )
  const yMax = Math.max(...d.value, ...d.balance) * 1.1

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Cars and big-ticket items</p>
          <h1 className={styles.h1}>Used vs. New</h1>
          <p className={styles.lead}>
            The same model, bought new or bought a few years old, each financed at its market&rsquo;s
            average rate. The used loan carries the worse rate; the question is whether the better
            price beats it.
          </p>
        </header>
      )}

      <Card tone="raised">
        <div className={styles.grid}>
          <div className={styles.controlsCol}>
            <p className={styles.lede}>
              Pick the car and the loan. Both deals put nothing down, so the underwater stretch
              shows at its worst.
            </p>
            <Slider
              label="Price new"
              value={price}
              onChange={setPrice}
              min={20000}
              max={80000}
              step={1000}
              readout={formatUSDWhole(price)}
            />
            <Slider
              label="Age of the used one"
              value={age}
              onChange={setAge}
              min={1}
              max={5}
              step={1}
              readout={`${age} yr${age > 1 ? 's' : ''} (${formatUSDWhole(deals.used.pricePaid)})`}
            />
            <Slider
              label="Loan term"
              value={months}
              onChange={setMonths}
              min={36}
              max={84}
              step={12}
              readout={`${months} months`}
            />
            <div className={styles.stats}>
              <Stat
                label={`New at ${pct(NEW_APR)}`}
                value={deals.new.payment}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={GOLD}
                animate={false}
              />
              <Stat
                label={`Used at ${pct(USED_APR)}`}
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
              Keep paying the new car&rsquo;s {formatUSDWhole(deals.new.payment)} against the used
              loan anyway and it is gone in {fastMonths} months instead of {months}.
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
                  ? `Bought new: the value falls fastest exactly when the balance is highest. Underwater for ${deals.new.underwaterMonths} months on these settings.`
                  : `Bought at ${age} year${age > 1 ? 's' : ''} old: the steep depreciation already happened to someone else. Underwater for ${deals.used.underwaterMonths} months on these settings.`
              }
              ariaLabel="Loan balance versus car value over the life of the loan"
              exportStats={[
                { label: 'Payment', value: `${formatUSDWhole(d.payment)}/mo` },
                { label: 'Total interest', value: formatUSDWhole(d.totalInterest), color: RED },
                { label: 'Months underwater', value: `${d.underwaterMonths}`, color: d.underwaterMonths > 0 ? RED : GREEN },
              ]}
            />
            <Callout tone="mark" label="The bigger loan cancels the better rate">
              On the default settings the five-year interest is nearly identical on both deals: the
              new car borrows more at a low rate, the used car borrows less at a high one. What
              separates them is the price paid and the depreciation still to come, both of which
              favor the buyer who lets the first owner take the steep part of the curve. The trade
              is repair risk and a shorter warranty; certified pre-owned splits the difference.
            </Callout>
          </div>
        </div>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Depreciation about 20% in year
        one and 15% a year after (Kelley Blue Book ballpark; varies by model). Average APRs from
        Experian, State of the Automotive Finance Market (Q4 2025): {pct(NEW_APR)} new,{' '}
        {pct(USED_APR)} used; your rate depends on your credit score. Nothing down on either loan.
      </p>
    </div>
  )
}
