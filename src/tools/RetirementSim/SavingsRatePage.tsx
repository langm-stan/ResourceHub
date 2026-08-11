import { useMemo } from 'react'
import { Callout, Card, MathSection, SegmentedControl, Slider, Stat } from '../../design-system'
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
 *
 * Retirement money is modeled either way a course poses it: spend the
 * pile to zero over a chosen number of years (the two-step method's
 * annuity), or live off returns alone and never touch the principal
 * (the goal is spending / r, which is the same annuity with infinite
 * years, and how exercises like "0.05 x $1.8M = $90,000" are built).
 */

const GOLD = 'var(--c-series-2)'
const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'

const CHART_RATIO = 0.5
const CHART_MAX_HEIGHT = 560

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`

type SpendMode = 'drawdown' | 'returns'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function SavingsRatePage({ intro = true }: { intro?: boolean } = {}) {
  const [income, setIncome] = usePersistentState('ifdm-savings-rate-income', 80000)
  const [saveRate, setSaveRate] = usePersistentState('ifdm-savings-rate-rate', 10)
  const [startAge, setStartAge] = usePersistentState('ifdm-savings-rate-start', 25)
  const [mode, setMode] = usePersistentState<SpendMode>(
    'ifdm-savings-rate-mode',
    'drawdown',
    (v) => v === 'drawdown' || v === 'returns',
  )
  // 0.07 * 100 = 7.000000000000001 in floating point; round to the slider's own precision.
  const [savePct, setSavePct] = usePersistentState(
    'ifdm-savings-rate-save-r',
    Math.round(R_SAVE * 1000) / 10,
  )
  const [retiredPct, setRetiredPct] = usePersistentState(
    'ifdm-savings-rate-retired-r',
    // 0.035 * 100 = 3.5000...04 in floating point; round to the slider's own precision.
    Math.round(R_RETIRED * 1000) / 10,
  )
  const [retYears, setRetYears] = usePersistentState('ifdm-savings-rate-years', RETIREMENT_YEARS)

  // Living off returns is the drawdown annuity with infinite years, so one
  // Infinity carries the mode through every shared formula: the annuity
  // factor (1 - (1+r)^-n)/r becomes 1/r.
  const yearsForMode = mode === 'returns' ? Infinity : retYears
  const saveR = savePct / 100
  const retiredR = retiredPct / 100

  const spend = income * (1 - saveRate / 100)
  const target = retirementTarget(spend, yearsForMode, retiredR)
  const myYears = yearsToFree(income, saveRate / 100, saveR, retiredR, yearsForMode)
  const myAge = myYears === null ? null : startAge + myYears

  const curve = useMemo(
    () => retirementCurve(income, saveR, retiredR, yearsForMode),
    [income, saveR, retiredR, yearsForMode],
  )
  const curveX = curve.map((r) => r.rate)
  const curveAges = curve.map((r) => startAge + r.years)
  const curveYMax = curveAges.length ? Math.max(...curveAges) + 4 : startAge + 40

  const ageAt = (rate: number) => {
    const y = yearsToFree(income, rate / 100, saveR, retiredR, yearsForMode)
    return y === null ? 'never' : `age ${startAge + y}`
  }

  const workingR = pct(saveR, savePct % 1 ? 1 : 0)
  const retiredRLabel = pct(retiredR, retiredPct % 1 ? 1 : 0)
  const goalClause =
    mode === 'returns'
      ? `the returns on the pile must cover ${formatUSDWhole(spend)} a year, with the pile itself never touched`
      : `the savings must replace ${formatUSDWhole(spend)} a year for ${retYears} years`

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
            {formatUSDWhole(spend)}, so {goalClause}. That goal is {formatUSDWhole(target)},
            reached {myAge ? `at age ${myAge}` : 'at no working age'}. After that day, work is a
            choice.
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
          <div className={styles.controlsRow}>
            <SegmentedControl
              label="The pile in retirement"
              options={[
                { value: 'drawdown', label: 'Spend it down' },
                { value: 'returns', label: 'Live off returns' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as SpendMode)}
            />
            <Slider
              label="Return while saving"
              value={savePct}
              onChange={setSavePct}
              min={4}
              max={10}
              step={0.5}
              editable
              suffix="%"
              precision={1}
            />
            <Slider
              label="Return while withdrawing"
              value={retiredPct}
              onChange={setRetiredPct}
              min={2}
              max={7}
              step={0.5}
              editable
              suffix="%"
              precision={1}
            />
            {mode === 'drawdown' && (
              <Slider
                label="Years of retirement"
                value={retYears}
                onChange={setRetYears}
                min={20}
                max={40}
                step={1}
                editable
                suffix="yrs"
                plain
              />
            )}
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
              caption={`Savings grow at ${workingR} while working and ${retiredRLabel} in retirement, starting at ${startAge}; the goal ${mode === 'returns' ? 'covers current spending from returns alone, forever' : `funds ${retYears} years of current spending`}. The curve bends: early points of savings rate buy the most years.`}
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
            rows={
              mode === 'returns'
                ? [
                    {
                      tex: '\\text{the goal} = \\frac{\\text{spending}}{r}',
                      caption: `Living off returns alone: the pile whose return at r = ${retiredRLabel} covers current spending every year, principal never touched.`,
                    },
                    {
                      tex: `\\frac{${texUSD(spend)}}{${retiredR}} = \\boxed{${texUSD(target)}}`,
                      caption: `Check it forward: ${retiredR} × ${formatUSDWhole(target)} = ${formatUSDWhole(target * retiredR)} a year, forever.`,
                      muted: true,
                    },
                    {
                      tex: `\\text{balance after } y \\text{ years} = \\text{saving} \\times \\frac{(1 + g)^{y} - 1}{g}`,
                      caption: `Each year the balance grows at g = ${workingR} and receives the year's saving; work becomes optional in the first year the balance covers the goal. At ${saveRate}%: ${formatUSDWhole((income * saveRate) / 100)} a year gets there ${myYears ? `in ${myYears} years, at age ${myAge}` : 'never'}.`,
                    },
                  ]
                : [
                    {
                      tex: '\\text{the goal} = \\text{spending} \\times \\frac{1 - (1 + r)^{-n}}{r}',
                      caption: `Step 1, run on current spending instead of a chosen retirement income: the savings that fund n = ${retYears} years of withdrawals at r = ${retiredRLabel}.`,
                    },
                    {
                      tex: `${texUSD(spend)} \\times \\frac{1 - (1 + ${retiredR})^{-${retYears}}}{${retiredR}} = \\boxed{${texUSD(target)}}`,
                      caption: `On the TVM calculator: N = ${retYears}, I/Y = ${retiredPct}, PMT = ${Math.round(spend).toLocaleString('en-US')}, FV = 0; solve for PV.`,
                      muted: true,
                    },
                    {
                      tex: `\\text{balance after } y \\text{ years} = \\text{saving} \\times \\frac{(1 + g)^{y} - 1}{g}`,
                      caption: `Each year the balance grows at g = ${workingR} and receives the year's saving; work becomes optional in the first year the balance covers the goal. At ${saveRate}%: ${formatUSDWhole((income * saveRate) / 100)} a year gets there ${myYears ? `in ${myYears} years, at age ${myAge}` : 'never'}.`,
                    },
                  ]
            }
          />
        </div>
      </Card>

      <p className={styles.footnote}>
        Defaults are the Retirement Planning Simulator&rsquo;s vetted figures: {pct(R_SAVE)} growth
        while working and {pct(R_RETIRED, 1)} while withdrawing over a {RETIREMENT_YEARS}-year
        retirement, all adjustable here. Living off returns keeps the pile intact and makes the
        goal spending divided by the withdrawal return. Income is after tax, and the savings rate
        is a share of it. Simplified annual compounding for teaching; an illustration, not
        financial advice.
      </p>
    </div>
  )
}
