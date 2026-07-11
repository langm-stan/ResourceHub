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
  const owner = [0, ...race.rows.map((r) => r.owner)]
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
            Two households live in the same house. One owns it, one rents it and invests what the owner
            tied up. The chart shows who is wealthier if the owner sold in any given year.
          </p>
        </header>
      )}

      <Card tone="raised">
        <div className={styles.grid}>
          <div className={styles.controlsCol}>
            <p className={styles.lede}>
              Set the price, what the same home rents for, and how long you might stay. The rent is
              the number worth arguing about: look it up for your town.
            </p>
            <Slider
              label="Home price"
              value={price}
              onChange={setPrice}
              min={250000}
              max={800000}
              step={10000}
              readout={formatUSDWhole(price)}
            />
            <Slider
              label="Monthly rent for the same home"
              value={rent}
              onChange={setRent}
              min={1000}
              max={5000}
              step={50}
              readout={formatUSDWhole(rent)}
            />
            <Slider
              label="Down payment"
              value={downPct}
              onChange={setDownPct}
              min={5}
              max={30}
              step={5}
              readout={`${downPct}%`}
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
              The year-one net cost counts interest, taxes, insurance, upkeep, and the return the
              down payment stopped earning, minus the principal you keep. Rent below that number and
              renting won the first year.
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
              caption={`Both start with the same cash. The owner's line begins under water because selling costs and closing costs hit before equity builds; time amortizes them away.`}
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
            <Callout tone="mark" label="Time is the variable that decides it">
              Three forces work for the owner as years pass: the principal share of the fixed payment
              grows, rents rise while the payment does not, and the one-time transaction costs spread
              across more years. Short stays hand all three advantages to the renter, which is why
              the break-even year, not the monthly payment, is the honest comparison.
            </Callout>
          </div>
        </div>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Assumes a 30-year fixed at{' '}
        {pct(APR, 1)} (Freddie Mac, 2026), property tax 1.1% and insurance 0.5% of value, upkeep at
        the 1% rule of thumb, rents growing {pct(RENT_GROWTH)} a year, {pct(ALT_RETURN)} on invested
        cash, {pct(BUY_CLOSING)} closing costs to buy and {pct(SELL_COSTS)} to sell. Taxes on the
        renter&rsquo;s investment gains and the owner&rsquo;s capital-gain exclusion are both
        ignored; they lean in opposite directions.
      </p>
    </div>
  )
}
