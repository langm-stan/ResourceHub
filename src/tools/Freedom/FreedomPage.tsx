import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  ScenarioChip,
  Stat,
  StepHeader,
  Tabs,
  Toggle,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole, formatYears, texNumber, texUSD } from '../../lib/format'
import {
  MATCH_BOOST,
  RETURN_RATE,
  SCENARIOS,
  SPEND_MULTIPLE,
  WITHDRAW_RATE,
  computeFreedom,
  wealthPath,
  yearsToFreedom,
} from './compute'
import { RateCurveChart } from './components/RateCurveChart'
import { CrossoverChart } from './components/CrossoverChart'
import styles from './FreedomPage.module.css'

type Surface = 'curve' | 'crossover' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'curve', label: 'The savings-rate curve' },
  { value: 'crossover', label: 'The crossover day' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function FreedomPage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('curve')
  const [age, setAge] = useState(24)
  const [income, setIncome] = useState(60_000)
  const [spendMo, setSpendMo] = useState(4_250)
  const [withMatch, setWithMatch] = useState(false)
  const [scenario, setScenario] = useState<string | null>('teacher')

  const applyScenario = (key: string) => {
    const s = SCENARIOS.find((x) => x.key === key)!
    setScenario(key)
    setAge(s.startAge)
    setIncome(s.income)
    setSpendMo(s.spendMo)
  }
  const edit = (setter: (v: number) => void) => (v: number) => {
    setScenario(null)
    setter(v)
  }

  const r = useMemo(() => computeFreedom(age, income, spendMo, withMatch), [age, income, spendMo, withMatch])
  const path = useMemo(() => wealthPath(age, r.savingYr, r.years), [age, r.savingYr, r.years])
  const active = scenario ? SCENARIOS.find((s) => s.key === scenario) : null
  const never = r.freedomAge === null

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Financial freedom</p>
          <h1 className={styles.h1}>When can you stop working?</h1>
          <p className={styles.lead}>
            Forget the word retirement. There is a day when the income from your savings covers your
            spending, and from that day on, work is a choice. When that day arrives depends almost
            entirely on one number you control: the share of your income you keep.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.controls}>
        <StepHeader title="Your situation" hint="Pick a life, or type your own numbers." />
        <div className={styles.chips}>
          {SCENARIOS.map((s) => (
            <ScenarioChip key={s.key} label={s.label} active={scenario === s.key} onClick={() => applyScenario(s.key)} />
          ))}
        </div>
        {active && <p className={styles.blurb}>{active.blurb}</p>}
        <div className={styles.controlsGrid}>
          <NumberField label="Age today" value={age} onChange={edit(setAge)} min={14} max={60} precision={0} />
          <NumberField label="Take-home income ($/yr)" value={income} onChange={edit(setIncome)} min={0} max={5_000_000} prefix="$" precision={0} />
          <NumberField label="Spending ($/mo)" value={spendMo} onChange={edit(setSpendMo)} min={0} max={400_000} prefix="$" precision={0} />
          <Toggle
            label="Count a typical employer match"
            checked={withMatch}
            onChange={setWithMatch}
          />
        </div>
        <p className={styles.footnote}>
          Fixed planning assumptions: savings earn a {formatPercent(RETURN_RATE, 0)} real return
          while you accumulate, and work becomes optional once your savings reach{' '}
          {SPEND_MULTIPLE.toFixed(0)} times annual spending, so a {formatPercent(WITHDRAW_RATE, 0)}{' '}
          withdrawal covers the bills. The match option adds {formatPercent(MATCH_BOOST, 0)} of
          income to saving, a typical 50-cents-per-dollar match on the first 6% of pay. Everything
          is in today&rsquo;s dollars.
        </p>
      </Card>

      <Card tone="raised" className={styles.controls}>
        <StepHeader
          title="The bottom line"
          hint="Three numbers tell the story. The tabs below show where they come from."
        />
        <div className={`${styles.stats} ${styles.bottomLineStats}`}>
          <Stat
            label="Work becomes optional at"
            value={never ? 0 : r.freedomAge!}
            format={(v) => (never ? 'never' : `age ${Math.round(v)}`)}
            emphasis
            accentColor={never ? CARDINAL : GREEN}
            note={never ? 'spending equals income, so nothing compounds' : `${formatYears(r.years)} from now`}
          />
          <Stat
            label="Your savings rate"
            value={r.savingsRate}
            format={(v) => formatPercent(v, 0)}
            animate={false}
            note={`${formatUSDWhole(r.savingYr)}/yr saved${withMatch ? ', match included' : ''}`}
          />
          <Stat
            label="The pile that buys freedom"
            value={r.pile}
            format={formatUSDWhole}
            note={`${SPEND_MULTIPLE.toFixed(0)}x your ${formatUSDWhole(r.spendYr)} of annual spending`}
          />
        </div>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'curve' && <CurveView r={r} />}
          {surface === 'crossover' && (
            <CrossoverView path={path} spendYr={r.spendYr} freedomAge={r.freedomAge} savingYr={r.savingYr} />
          )}
          {surface === 'math' && <MathView r={r} age={age} />}
        </Card>
        <Callout tone="plain" label="Educational model, not financial advice">
          This simplification holds spending and saving flat in real terms, ignores taxes on the
          way out (the Understanding Taxes lesson covers those), and treats the{' '}
          {formatPercent(WITHDRAW_RATE, 0)} withdrawal guideline as a planning rule of thumb, not a
          guarantee. It shows the structure of the decision: the gap between what you earn and what
          you spend is what buys freedom.
        </Callout>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CurveView({ r }: { r: ReturnType<typeof computeFreedom> }) {
  const s = r.savingYr + r.spendYr > 0 ? r.savingYr / (r.savingYr + r.spendYr) : 0
  const tenPct = yearsToFreedom(0.1)
  const half = yearsToFreedom(0.5)
  return (
    <>
      <StepHeader
        title="Income does not decide this. The savings rate does."
        hint="The curve answers one question: saving this share of your income, how many years until the pile reaches 25 times your spending? Salary appears nowhere on it. A raise only helps if the spending does not rise to meet it."
      />
      <div className={styles.stats}>
        <Stat
          label="Save 10% of income"
          value={tenPct}
          format={(v) => `${Math.round(v)} years`}
          animate={false}
          note="a full career: the classic retire-at-65 path"
        />
        <Stat
          label="Save 25%"
          value={yearsToFreedom(0.25)}
          format={(v) => `${Math.round(v)} years`}
          animate={false}
          note="free in your late 40s from a first job"
        />
        <Stat
          label="Save 50%"
          value={half}
          format={(v) => `${Math.round(v)} years`}
          animate={false}
          accentColor={GREEN}
          note="the course's early-retirement couple"
        />
      </div>

      <RateCurveChart
        ownRate={s}
        ownYears={r.years}
        caption={`Years until work is optional, by savings rate, at a ${formatPercent(RETURN_RATE, 0)} real return with a ${SPEND_MULTIPLE.toFixed(0)}x spending target. The curve is steepest at the start: moving from 10% to 15% buys back about ${Math.round(tenPct - yearsToFreedom(0.15))} years of working life.`}
        exportStats={[
          { label: 'Your savings rate', value: formatPercent(r.savingsRate, 0), color: GREEN },
          {
            label: 'Work optional in',
            value: Number.isFinite(r.years) ? formatYears(r.years) : 'never',
            color: CARDINAL,
          },
        ]}
      />

      <Callout tone="note" label="Why the rich go broke anyway">
        A $600,000 earner who spends $550,000 saves 8% and needs a longer career than a barista
        saving 25%. That is MC Hammer and half the celebrity bankruptcy stories in one sentence:
        income buys lifestyle, but only the gap buys freedom.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function CrossoverView({
  path,
  spendYr,
  freedomAge,
  savingYr,
}: {
  path: ReturnType<typeof wealthPath>
  spendYr: number
  freedomAge: number | null
  savingYr: number
}) {
  return (
    <>
      <StepHeader
        title="The day your money out-earns your budget"
        hint="Every year of saving raises your wealth, and 4% of that wealth is the paycheck your investments could pay you. Freedom is not a birthday. It is the crossover."
      />
      <div className={styles.stats}>
        <Stat label="You put in per year" value={savingYr} format={formatUSDWhole} accentColor={GREEN} />
        <Stat label="Your spending per year" value={spendYr} format={formatUSDWhole} accentColor={CARDINAL} />
        <Stat
          label="Crossover"
          value={freedomAge ?? 0}
          format={(v) => (freedomAge === null ? 'never' : `age ${Math.round(v)}`)}
          emphasis
          animate={false}
        />
      </div>

      <CrossoverChart
        path={path}
        spendYr={spendYr}
        freedomAge={freedomAge}
        caption={
          freedomAge === null
            ? 'With nothing saved, the investment paycheck stays at zero and never crosses the spending line.'
            : `The green line is the annual income a ${formatPercent(WITHDRAW_RATE, 0)} withdrawal would pay at each age. Where it crosses your spending, work becomes optional. Nothing about the job changes that day; what changed is that you no longer need it.`
        }
        exportStats={[
          { label: 'Spending', value: `${formatUSDWhole(spendYr)}/yr`, color: CARDINAL },
          {
            label: 'Work optional at',
            value: freedomAge === null ? 'never' : `age ${Math.round(freedomAge)}`,
            color: GREEN,
          },
        ]}
      />

      <Callout tone="note" label="For the classroom">
        Have students find the crossover for their dream job, then for the same job spending $500
        less a month. The second crossover comes years earlier, and no salary negotiation was
        involved. That is the lesson.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function MathView({ r, age }: { r: ReturnType<typeof computeFreedom>; age: number }) {
  const s = r.savingYr + r.spendYr > 0 ? r.savingYr / (r.savingYr + r.spendYr) : 0
  return (
    <>
      <StepHeader
        title="Every number on this page, derived"
        hint="The same calculations the tool runs, with your inputs substituted in."
      />
      <FormulaBlock
        tex={`${texUSD(r.income)} - ${texUSD(r.spendYr)}${r.savingYr > Math.max(0, r.income - r.spendYr) ? ` + ${texUSD(r.savingYr - Math.max(0, r.income - r.spendYr))}\\text{ match}` : ''} = ${texUSD(r.savingYr)}\\text{ saved per year}`}
        caption="Step 1. Saving is what income does not consume. The employer match, when counted, is added on top."
      />
      <FormulaBlock
        tex={`\\text{freedom pile} = ${SPEND_MULTIPLE.toFixed(0)} \\times ${texUSD(r.spendYr)} = ${texUSD(r.pile)}`}
        caption={`Step 2. At a ${formatPercent(WITHDRAW_RATE, 0)} withdrawal rate, ${SPEND_MULTIPLE.toFixed(0)} times annual spending pays the bills indefinitely. Spending, not income, sets the target.`}
        muted
      />
      <FormulaBlock
        tex={`${texUSD(r.savingYr)} \\cdot \\frac{(1+${texNumber(RETURN_RATE, 2)})^{T}-1}{${texNumber(RETURN_RATE, 2)}} = ${texUSD(r.pile)} \\;\\Rightarrow\\; T = ${Number.isFinite(r.years) ? texNumber(r.years, 1) : '\\infty'}\\text{ years}`}
        caption="Step 3. The future value of the yearly saving, set equal to the pile and solved for T. This is the Day 1 annuity formula run in reverse."
        muted
      />
      <FormulaBlock
        tex={`\\text{freedom age} = ${texNumber(age)} + ${Number.isFinite(r.years) ? texNumber(r.years, 1) : '\\infty'} = ${r.freedomAge === null ? '\\text{never}' : `\\boxed{${texNumber(Math.round(r.freedomAge))}}`}`}
        caption="Step 4. Start earlier and the same savings rate lands at a younger age. Time is the input teenagers have the most of."
      />
      <FormulaBlock
        tex={`T \\text{ depends only on } s = \\frac{\\text{saving}}{\\text{saving} + \\text{spending}} = ${texNumber(s, 3)}`}
        caption="Step 5. Divide both sides of step 3 by spending and income cancels out entirely. Two people with wildly different salaries but the same savings rate reach freedom in the same number of years."
        muted
      />
    </>
  )
}
