import { useMemo } from 'react'
import { Callout, Card, MathSection, Slider, Stat } from '../../design-system'
import { formatUSDWhole, texUSD } from '../../lib/format'
import { usePersistentState } from '../../hooks/usePersistentState'
// Shared with Chance & Ownership: same lesson family, same chart canvas.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import {
  R_RETIRED,
  R_SAVE,
  RETIREMENT_YEARS,
  retirementCurve,
  retirementTarget,
  yearsToFree,
} from './compute'
import styles from './RetirementSimPage.module.css'

/*
 * Savings Rate and Retirement Date: the two-step method flipped around.
 * Instead of choosing a retirement and solving for the saving, fix the
 * share of income saved and solve for the day work becomes optional.
 * Split out of the Retirement Planning Simulator so each tool carries
 * one idea; the math and chart canvas are shared through ./compute.
 */

const GOLD = 'var(--c-series-2)'
const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'

const CHART_RATIO = 0.5
const CHART_MAX_HEIGHT = 560

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function SavingsRatePage({ intro = true }: { intro?: boolean } = {}) {
  const [income, setIncome] = usePersistentState('ifdm-savings-rate-income', 80000)
  const [saveRate, setSaveRate] = usePersistentState('ifdm-savings-rate-rate', 10)
  const [startAge, setStartAge] = usePersistentState('ifdm-savings-rate-start', 25)

  const spend = income * (1 - saveRate / 100)
  const target = retirementTarget(spend)
  const myYears = yearsToFree(income, saveRate / 100)
  const myAge = myYears === null ? null : startAge + myYears

  const curve = useMemo(() => retirementCurve(income), [income])
  const curveX = curve.map((r) => r.rate)
  const curveAges = curve.map((r) => startAge + r.years)
  const curveYMax = Math.max(...curveAges) + 4

  const ageAt = (rate: number) => {
    const y = yearsToFree(income, rate / 100)
    return y === null ? 'never' : `age ${startAge + y}`
  }

  const workingR = pct(R_SAVE)
  const retiredR = pct(R_RETIRED, 1)

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Planning for retirement</p>
          <h1 className={styles.h1}>Savings Rate and Retirement Date</h1>
        </header>
      )}

      <Card tone="raised">
        <div className={styles.section}>
          <p className={styles.sectionLede}>
            The two-step method flipped around: fix the share of income saved, and solve for the
            date. Saving {saveRate}% of {formatUSDWhole(income)} means living on{' '}
            {formatUSDWhole(spend)}, so the savings must replace {formatUSDWhole(spend)} a year.
            That goal is {formatUSDWhole(target)}, reached{' '}
            {myAge ? `at age ${myAge}` : 'at no working age'}. After that day, work is a choice.
          </p>

          <div className={styles.controlsRow}>
            <Slider
              label="After-tax income"
              value={income}
              onChange={setIncome}
              min={40000}
              max={200000}
              step={5000}
              editable
              prefix="$"
              inputMax={1_000_000}
            />
            <Slider
              label="Savings rate"
              value={saveRate}
              onChange={setSaveRate}
              min={5}
              max={70}
              step={1}
              editable
              suffix="%"
            />
            <Slider
              label="Age saving starts"
              value={startAge}
              onChange={setStartAge}
              min={20}
              max={45}
              step={1}
              editable
              prefix="age"
              plain
            />
          </div>
          <div className={styles.stats}>
            <Stat label="Saving per year" value={(income * saveRate) / 100} format={formatUSDWhole} animate={false} />
            <Stat label="Living on" value={spend} format={formatUSDWhole} animate={false} />
            <Stat label="Savings needed (the goal)" value={target} format={formatUSDWhole} accentColor={GOLD} animate={false} />
            <Stat
              label="Work becomes optional at"
              value={myAge ?? 0}
              format={(v) => (myAge ? `age ${Math.round(v)}` : 'never')}
              accentColor={GREEN}
              emphasis
              animate={false}
            />
          </div>
          <p className={styles.note}>
            The chart does not change when income moves: saving and spending scale together, so the
            date depends on the savings rate, not the paycheck.
          </p>

          <div>
            <div className={styles.legend}>
              <span style={{ color: GOLD }}>&#9632; retirement age by savings rate</span>
              <span style={{ color: RED }}>&#9476; your savings rate</span>
            </div>
            <StationChart
              x={curveX}
              yMin={startAge}
              yMax={curveYMax}
              ratio={CHART_RATIO}
              maxHeight={CHART_MAX_HEIGHT}
              xRef={saveRate}
              xRefLabel="you"
              lines={[{ ys: curveAges, color: GOLD, width: 3, label: 'Retirement age' }]}
              xTickFormat={(v) => `${Math.round(v)}%`}
              yTickFormat={(v) => `${Math.round(v)}`}
              xHoverLabel={(v) => `${Math.round(v)}% savings rate`}
              hoverValueFormat={(v) => `age ${Math.round(v)}`}
              figure="Figure 1."
              caption={`Savings grow at ${workingR} while working and ${retiredR} in retirement, starting at ${startAge}; the goal funds ${RETIREMENT_YEARS} years of current spending. The curve bends: early points of savings rate buy the most years.`}
              ariaLabel="Retirement age as a function of savings rate"
              exportStats={[
                { label: 'Save 10%', value: ageAt(10), color: GOLD },
                { label: 'Save 25%', value: ageAt(25), color: GOLD },
                { label: 'Save half', value: ageAt(50), color: GREEN },
              ]}
            />
          </div>
          <Callout tone="mark" label="Why the curve bends">
            A higher savings rate adds more each year and shrinks the spending the account must
            replace, so the first ten points of savings rate move the age more than the last ten.
          </Callout>

          <MathSection
            hint="The two-step method from the Retirement Planning Simulator, run backward from a savings rate."
            rows={[
              {
                tex: '\\text{the goal} = \\text{spending} \\times \\frac{1 - (1 + r)^{-n}}{r}',
                caption: `Step 1, run on current spending instead of a chosen retirement income: the savings that fund n = ${RETIREMENT_YEARS} years of withdrawals at r = ${retiredR}.`,
              },
              {
                tex: `${texUSD(spend)} \\times \\frac{1 - (1 + ${R_RETIRED})^{-${RETIREMENT_YEARS}}}{${R_RETIRED}} = \\boxed{${texUSD(target)}}`,
                caption: `On the TVM calculator: N = ${RETIREMENT_YEARS}, I/Y = ${(R_RETIRED * 100).toFixed(1)}, PMT = ${Math.round(spend).toLocaleString('en-US')}, FV = 0; solve for PV.`,
                muted: true,
              },
              {
                tex: `\\text{balance after } y \\text{ years} = \\text{saving} \\times \\frac{(1 + g)^{y} - 1}{g}`,
                caption: `Each year the balance grows at g = ${workingR} and receives the year's saving; work becomes optional in the first year the balance covers the goal. At ${saveRate}%: ${formatUSDWhole((income * saveRate) / 100)} a year gets there ${myYears ? `in ${myYears} years, at age ${myAge}` : 'never'}.`,
              },
            ]}
          />
        </div>
      </Card>

      <p className={styles.footnote}>
        Vetted planning rates, fixed here: {workingR} growth while working, {retiredR} while
        withdrawing, over a {RETIREMENT_YEARS}-year retirement, the same figures as the Retirement
        Planning Simulator. Income is after tax, and the savings rate is a share of it. Simplified
        annual compounding for teaching; an illustration, not financial advice.
      </p>
    </div>
  )
}
