import { useMemo, useState } from 'react'
import { Callout, Card, SegmentedControl, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared chart canvas from the lesson family.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import {
  ALT_RETURN,
  APR,
  BUY_CLOSING,
  HORIZON,
  RENT_GROWTH,
  SELL_COSTS,
  wealthRace,
  type Growth,
} from './compute'
import styles from './RentOrOwnPage.module.css'

/*
 * Rent or Own: the year-one cost test from the housing session, then the
 * longer race. Same home either way; the only question is which household
 * ends up wealthier, and when.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function RentOrOwnPage({ intro = true }: { intro?: boolean } = {}) {
  const [price, setPrice] = useState(420000)
  const [rent, setRent] = useState(2600)
  const [downPct, setDownPct] = useState(20)
  const [growth, setGrowth] = useState<Growth>('typical')

  const race = useMemo(() => wealthRace(price, rent, downPct / 100, growth), [price, rent, downPct, growth])
  const x = [0, ...race.rows.map((r) => r.year)]
  // Year 0: selling on day one recovers the equity minus the 6% selling costs;
  // the renter still holds the down payment and closing costs as cash.
  const owner0 = Math.round(price * (1 - SELL_COSTS) - price * (1 - downPct / 100))
  const owner = [owner0, ...race.rows.map((r) => r.owner)]
  const renter = [Math.round(price * (downPct / 100 + BUY_CLOSING)), ...race.rows.map((r) => r.renter)]
  const yMax = Math.max(...owner, ...renter) * 1.08
  const yMin = Math.min(0, ...owner) * 1.15
  const last = race.rows[race.rows.length - 1]!

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Housing</p>
          <h1 className={styles.h1}>Rent or Own</h1>
          <p className={styles.lead}>
            One household owns the house; the other rents it and invests the difference. The chart
            shows who is wealthier in any year.
          </p>
        </header>
      )}

      <Card tone="raised">
        <div className={styles.grid}>
          <div className={styles.controlsCol}>
            <p className={styles.lede}>
              Set the price, the rent for the same home, and the down payment, from real listings
              when you can.
            </p>
            <Slider
              label="Home price"
              value={price}
              onChange={setPrice}
              min={100000}
              max={2000000}
              step={10000}
              editable
              prefix="$"
            />
            <Slider
              label="Monthly rent for the same home"
              value={rent}
              onChange={setRent}
              min={500}
              max={10000}
              step={50}
              editable
              prefix="$"
            />
            <Slider
              label="Down payment"
              value={downPct}
              onChange={setDownPct}
              min={0}
              max={50}
              step={1}
              editable
              suffix="%"
              precision={1}
            />
            <SegmentedControl
              label="Home price growth"
              options={[
                { value: 'flat', label: 'Flat (0%)' },
                { value: 'typical', label: 'Typical (3%)' },
                { value: 'hot', label: 'Hot (5%)' },
              ]}
              value={growth}
              onChange={setGrowth}
            />
            <div className={styles.stats}>
              <Stat
                label="Owning costs, year one"
                value={race.ownerMonthlyYear1}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                animate={false}
              />
              <Stat
                label="Net cost of owning, year one"
                value={race.netOwnCostYear1}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={race.netOwnCostYear1 > rent ? RED : GREEN}
                emphasis
                animate={false}
              />
              <Stat
                label="Owner catches the renter"
                value={race.breakEvenYear ?? 0}
                format={(v) => (race.breakEvenYear ? `year ${Math.round(v)}` : `not in ${HORIZON} years`)}
                accentColor={race.breakEvenYear ? GREEN : RED}
                animate={false}
              />
            </div>
            <p className={styles.note}>
              Year-one net cost: interest, property tax, insurance, upkeep, and the down
              payment&rsquo;s lost return, minus principal paid. Rent below that number and renting
              cost less.
            </p>
          </div>

          <div className={styles.chartCol}>
            <div className={styles.legend}>
              <span style={{ color: GOLD }}>&#9632; owner&rsquo;s wealth if sold that year</span>
              <span style={{ color: GREEN }}>&#9632; renter&rsquo;s invested wealth</span>
            </div>
            <StationChart
              x={x}
              yMin={yMin}
              yMax={yMax}
              lines={[
                { ys: renter, color: GREEN, width: 3, label: 'Renter, investing the difference' },
                { ys: owner, color: GOLD, width: 3, label: 'Owner, if sold that year' },
              ]}
              xTickFormat={(v) => `${Math.round(v)} yr`}
              xHoverLabel={(v) => `Year ${Math.round(v)}`}
              figure="Figure 1."
              caption={`The owner starts behind the renter: closing and selling costs come out before equity builds.`}
              ariaLabel="Owner versus renter wealth over fifteen years"
              exportStats={[
                { label: 'Owner, year 15', value: formatUSDWhole(last.owner), color: GOLD },
                { label: 'Renter, year 15', value: formatUSDWhole(last.renter), color: GREEN },
                {
                  label: 'Break-even',
                  value: race.breakEvenYear ? `year ${race.breakEvenYear}` : `beyond ${HORIZON} yrs`,
                },
              ]}
            />
            <Callout tone="mark" label="How the comparison shifts with time">
              As years pass, the principal share grows, rents rise against a flat payment, and the
              one-time costs spread out. All three favor the owner: the break-even year is the
              number to watch.
            </Callout>
          </div>
        </div>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. 30-year fixed at {pct(APR, 1)}{' '}
        (Freddie Mac, 2026); property tax 1.1%, insurance 0.5%, upkeep 1% of value; rents grow{' '}
        {pct(RENT_GROWTH)} a year; invested cash earns {pct(ALT_RETURN)}; closing costs{' '}
        {pct(BUY_CLOSING)} to buy, {pct(SELL_COSTS)} to sell. Taxes on both sides are ignored.
      </p>
    </div>
  )
}
