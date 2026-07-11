import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  Toggle,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole, texUSD } from '../../lib/format'
import {
  computeFromIncomes,
  computeLifeCycle,
  simulateConsumptionPath,
  type LifeCycleState,
} from './compute'
import { LifeCycleChart } from './components/LifeCycleChart'
import { WealthChart } from './components/WealthChart'
import styles from './LifeCyclePage.module.css'

type Surface = 'overview' | 'case-study' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'case-study', label: 'Case study: the NFL' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const CARDINAL = 'var(--c-accent)'

/*
 * Defaults vetted against public data (see the research notes in the repo
 * history): start ≈ average bachelor's starting salary (NACE 2025, ~$68.7k);
 * retire at 67 = Social Security full retirement age for anyone born 1960+;
 * plan to 90 (SSA longevity tables — Lusardi's "longevity literacy" point);
 * retirement income ≈ the ~40% of earnings Social Security replaces for a
 * middle earner. The earnings hump — rising to a peak around age 50, drifting
 * down after — matches BLS/Census age–earnings profiles; a $120k peak is in
 * line with median earnings for bachelor's holders at those ages.
 *
 * realRatePct is the return on savings above inflation, default 2%/yr ≈ the
 * SSA Trustees' long-run real-interest assumption. It was briefly removed as
 * a control ("real interest rate" read as jargon), then reinstated in plain
 * language ("Savings grow at") when the user asked what the wealth path
 * earns. Keep the label jargon-free. All amounts stay in today's dollars.
 */
const DEFAULTS: LifeCycleState = {
  startAge: 22,
  retireAge: 67,
  endAge: 90,
  startIncome: 68_000,
  peakIncome: 120_000,
  peakAge: 50,
  retirementIncome: 38_000,
  ssStartAge: 67,
  realRatePct: 2,
  noBorrowing: false,
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function LifeCyclePage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('overview')
  const [state, setState] = useState<LifeCycleState>(DEFAULTS)
  const update = (patch: Partial<LifeCycleState>) => setState((s) => ({ ...s, ...patch }))

  const results = useMemo(() => computeLifeCycle(state), [state])

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · The life-cycle model</p>
          <h1 className={styles.h1}>Smooth your spending, not your income</h1>
          <p className={styles.lead}>
            Income rises, peaks, and falls over a working life. Your standard of living does not have
            to follow it. The life-cycle model, the framework behind modern retirement planning, shows
            how borrowing, saving, and spending down let a household keep steady consumption from a
            changing income.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.controls}>
        <div className={styles.controlsHeader}>
          <StepHeader title="Sketch a lifetime" />
          <Button variant="quiet" size="sm" onClick={() => setState(DEFAULTS)}>
            Reset to defaults
          </Button>
        </div>
        <p className={styles.groupLabel}>Working years</p>
        <div className={styles.controlsGrid}>
          <NumberField label="Start working at age" value={state.startAge} onChange={(v) => { const a = Math.min(v, state.retireAge - 5); update({ startAge: a, peakAge: Math.max(state.peakAge, a + 5) }) }} min={16} max={40} precision={0} />
          <NumberField label="Starting salary ($/yr)" value={state.startIncome} onChange={(v) => update({ startIncome: v, peakIncome: Math.max(state.peakIncome, v) })} min={0} max={1_000_000} prefix="$" precision={0} />
          <NumberField label="Peak salary ($/yr)" value={state.peakIncome} onChange={(v) => update({ peakIncome: Math.max(v, state.startIncome) })} min={0} max={2_000_000} prefix="$" precision={0} />
          <Slider
            label="Salary peaks at"
            value={state.peakAge}
            onChange={(v) => update({ peakAge: Math.min(Math.max(v, state.startAge + 5), state.retireAge) })}
            min={30}
            max={75}
            step={1}
            readout={state.peakAge >= state.retireAge ? 'rises until retirement' : `age ${state.peakAge}`}
            note="Earnings typically peak around 50."
          />
        </div>

        <p className={styles.groupLabel}>Retirement</p>
        <div className={styles.controlsGrid}>
          <Slider
            label="Retire at"
            value={state.retireAge}
            onChange={(v) => update({ retireAge: v, startAge: Math.min(state.startAge, v - 5), peakAge: Math.min(state.peakAge, v), endAge: Math.max(state.endAge, v + 5) })}
            min={40}
            max={75}
            step={1}
            readout={`age ${state.retireAge}`}
            note="67 is Social Security's full retirement age."
          />
          <Slider label="Plan to age" value={state.endAge} onChange={(v) => update({ endAge: Math.max(v, state.retireAge + 5) })} min={70} max={105} step={1} readout={`age ${state.endAge}`} note="Most people underestimate this." />
          <NumberField label="Retirement income ($/yr)" value={state.retirementIncome} onChange={(v) => update({ retirementIncome: v })} min={0} max={500_000} prefix="$" precision={0} />
          <Slider
            label="Retirement income starts at"
            value={state.ssStartAge}
            onChange={(v) => update({ ssStartAge: v })}
            min={40}
            max={75}
            step={1}
            readout={`age ${state.ssStartAge}`}
            note={
              state.ssStartAge > state.retireAge
                ? `No income between retiring at ${state.retireAge} and ${state.ssStartAge}; savings cover those ${state.ssStartAge - state.retireAge} years.`
                : 'Social Security begins between 62 and 70; pensions can start earlier.'
            }
          />
        </div>

        <p className={styles.groupLabel}>Savings and borrowing</p>
        <div className={styles.controlsGrid}>
          <Slider
            label="Return on savings/investments after inflation"
            value={state.realRatePct}
            onChange={(v) => update({ realRatePct: v })}
            min={0}
            max={7}
            step={0.5}
            readout={`${state.realRatePct}% per year`}
            note={
              state.realRatePct === 0
                ? 'Savings just keep up with prices, like an account paying 3% with 3% inflation.'
                : `Invested money buys ${state.realRatePct}% more each year, like earning ${state.realRatePct + 3}% while prices rise 3%.`
            }
          />
          <Toggle
            label="No borrowing allowed"
            checked={state.noBorrowing}
            onChange={(v) => update({ noBorrowing: v })}
            note="No borrowing against future income."
          />
        </div>
        <p className={styles.footnote}>
          Everything is in today&rsquo;s dollars, so inflation is already accounted for: the
          return slider measures growth beyond prices. Retirement income of{' '}
          {formatUSDWhole(state.retirementIncome)} is roughly what Social Security replaces for a
          typical earner.
        </p>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'overview' && <Overview state={state} results={results} />}
          {surface === 'case-study' && <CaseStudy realRatePct={state.realRatePct} />}
          {surface === 'math' && <MathView state={state} results={results} />}
        </Card>
        <Callout tone="plain" label="A deliberately simple model">
          This is the deterministic teaching version: one known income path, no uncertainty, no
          bequest. Taxes are not modeled separately; they are one line item inside the green
          consumption line, alongside rent and groceries. Enter take-home pay instead of salary for
          an after-tax picture. A fuller treatment adds a reserve for unexpected shocks, employer
          matches, and investment risk. The Understanding Taxes lesson covers what the tax bill
          does to a paycheck.
        </Callout>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Overview({
  state,
  results: r,
}: {
  state: LifeCycleState
  results: ReturnType<typeof computeLifeCycle>
}) {
  const borrows = !state.noBorrowing && r.maxDebt < -1
  // The same lifetime with no growth on savings, for the interest callout:
  // it makes the "higher return means more spending AND less peak wealth"
  // comparison concrete with the reader's own numbers.
  const noGrowth = useMemo(
    () => (state.realRatePct > 0 ? computeLifeCycle({ ...state, realRatePct: 0 }) : null),
    [state]
  )
  // Net dollars set aside out of working-years income. Pairing this with
  // wealth at retirement explains the otherwise confusing cases (an early
  // retirement needs a similar nest egg from far fewer earning years, so the
  // saving share has to be much higher; growth covers the difference).
  const working = r.points.filter((p) => p.age < state.retireAge)
  const totalSaved = working.reduce((s, p) => s + p.saving, 0)
  const careerIncome = working.reduce((s, p) => s + p.income, 0)
  const savedShare = careerIncome > 0 ? totalSaved / careerIncome : 0
  const ssStart = Math.max(state.retireAge, state.ssStartAge)
  const incomeDropText =
    state.ssStartAge > state.retireAge
      ? `stops at ${state.retireAge}, with ${formatUSDWhole(state.retirementIncome)} of retirement income from ${state.ssStartAge}`
      : state.ssStartAge < state.retireAge
        ? `drops to ${formatUSDWhole(state.retirementIncome)} at ${state.retireAge}; the total includes a ${formatUSDWhole(state.retirementIncome)} pension that begins at ${state.ssStartAge}`
        : `drops to ${formatUSDWhole(state.retirementIncome)} at ${state.retireAge}`
  return (
    <>
      <StepHeader
        title="Income, consumption, and wealth over a lifetime"
        hint="The green line is the constant spending your lifetime income can support."
      />
      <div className={styles.stats}>
        <Stat label="Sustainable annual spending" value={r.smoothedConsumption} format={formatUSDWhole} emphasis accentColor={GREEN} />
        <Stat
          label="Saved out of income"
          value={totalSaved}
          format={formatUSDWhole}
          note={`${formatPercent(savedShare, 0)} of career earnings; growth adds the rest`}
        />
        <Stat label={`Wealth at retirement (${r.peakWealthAge})`} value={r.peakWealth} format={formatUSDWhole} accentColor={AMBER} />
        {borrows ? (
          <Stat label="Peak early-career borrowing" value={-r.maxDebt} format={formatUSDWhole} accentColor={CARDINAL} />
        ) : (
          <Stat label="Years constrained to income" value={r.constrainedYears} format={(v) => `${Math.round(v)}`} animate={false} />
        )}
      </div>

      <LifeCycleChart
        points={r.points}
        retireAge={state.retireAge}
        exportStats={[
          { label: 'Sustainable annual spending', value: formatUSDWhole(r.smoothedConsumption), color: GREEN },
          { label: 'Saved out of income', value: `${formatUSDWhole(totalSaved)} (${formatPercent(savedShare, 0)})` },
          { label: `Wealth at retirement (${r.peakWealthAge})`, value: formatUSDWhole(r.peakWealth), color: AMBER },
          ...(borrows
            ? [{ label: 'Peak early-career borrowing', value: formatUSDWhole(-r.maxDebt), color: CARDINAL }]
            : []),
        ]}
        caption={
          state.peakAge < state.retireAge
            ? `Income (grey) peaks at ${formatUSDWhole(r.peakIncome)} around age ${r.peakIncomeAge}, then ${incomeDropText}. Smoothed consumption (green) holds at ${formatUSDWhole(r.smoothedConsumption)}.`
            : `Income (grey) rises to ${formatUSDWhole(r.finalSalary)}, then ${incomeDropText}. Smoothed consumption (green) holds at ${formatUSDWhole(r.smoothedConsumption)}.`
        }
      />
      <WealthChart
        points={r.points}
        peakAge={r.peakWealthAge}
        exportStats={[
          { label: `Peak net worth (${r.peakWealthAge})`, value: formatUSDWhole(r.peakWealth), color: AMBER },
          { label: 'Saved out of income', value: `${formatUSDWhole(totalSaved)} (${formatPercent(savedShare, 0)})` },
          ...(borrows
            ? [{ label: 'Peak early-career borrowing', value: formatUSDWhole(-r.maxDebt), color: CARDINAL }]
            : []),
          { label: 'Return after inflation', value: `${state.realRatePct}% per year` },
        ]}
        caption={`${borrows ? 'Borrow early, then build' : 'Build'} to ${formatUSDWhole(r.peakWealth)} by ${r.peakWealthAge}, then spend down to zero by ${state.endAge}. Balances earn ${state.realRatePct}% a year above inflation.`}
      />

      <Callout tone="note" label="How the balance grows">
        Each year the <strong>entire balance</strong> earns {state.realRatePct}%, and that
        year&rsquo;s saving is added to it. A negative balance is charged the same{' '}
        {state.realRatePct}%: the model borrows and saves at one rate, a simplification, since real
        borrowing usually costs more.{' '}
        {noGrowth ? (
          <>
            A higher return lifts spending and shrinks the nest egg needed: at 0% this lifetime
            supports {formatUSDWhole(noGrowth.smoothedConsumption)} a year on a{' '}
            {formatUSDWhole(noGrowth.peakWealth)} peak; at {state.realRatePct}% it supports{' '}
            <strong>{formatUSDWhole(r.smoothedConsumption)}</strong> on{' '}
            <strong>{formatUSDWhole(r.peakWealth)}</strong>, because the balance keeps earning
            through retirement. The target is steady spending, not a large balance.
          </>
        ) : (
          <>
            At 0% wealth is just the running total of past saving. Raise the return and spending
            rises while the needed nest egg shrinks.
          </>
        )}
      </Callout>

      <Callout tone="note" label="The three phases">
        {borrows ? (
          <>
            In the early years income is below the smooth level, so the model calls for{' '}
            <strong>borrowing</strong>. Student loans and mortgages are this phase in practice.
          </>
        ) : state.noBorrowing && r.constrainedYears > 0 ? (
          <>
            With no access to credit, consumption equals income for the first{' '}
            <strong>{r.constrainedYears} years</strong>. Smoothing begins once income reaches the
            sustainable level. Turn the toggle off to compare.
          </>
        ) : (
          <>
            Income exceeds the smooth level from the first year, so saving starts immediately.
          </>
        )}{' '}
        In mid-career the gap between income and the green line is <strong>saved</strong>.{' '}
        {ssStart > state.retireAge && (
          <>
            Between {state.retireAge} and {ssStart} there is no income at all, so savings carry
            every dollar of spending.{' '}
          </>
        )}
        From {ssStart} on, retirement income covers {formatUSDWhole(state.retirementIncome)} and
        savings pay the remaining{' '}
        <strong>{formatUSDWhole(Math.max(0, r.smoothedConsumption - state.retirementIncome))}</strong>{' '}
        each year.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

/*
 * The NFL case from Lesson #3 of Faculty Insights, built on Carlson, Kim,
 * Lusardi & Camerer (2015, AER P&P 105(5): 381-84; NBER WP 21085). Facts
 * verified against the paper (July 2026):
 * - Sample: all players drafted 1996-2003 (N = 2,016).
 * - Median career length: 6 years.
 * - Median TOTAL career earnings: ~$3.2M in year-2000 dollars ("The median
 *   level of earnings across all players is about $3.2 million"), i.e. about
 *   $533k per playing year at the median, NOT $3.2M/yr.
 * - Bankruptcies: 1.9% within 2 years of retirement, rising steadily to 15.7%
 *   by year 12. Career earnings and career length do NOT predict bankruptcy.
 * - Calibrated life-cycle savers with the same income spike essentially never
 *   go bankrupt in simulation (Livshits, MacGee & Tertilt benchmark).
 * All figures below are in year-2000 dollars to match the paper. Post-career
 * and pension incomes are our stylized assumptions, not from the paper.
 *
 * The "spending tracks income" path (the failure the paper documents, and
 * the Richard Fuscone pattern generally: lifestyle set by peak earnings that
 * stays high after earnings stop) is also stylized: spend 75% of each
 * playing-year paycheck, then hold spending at half the playing lifestyle.
 * simulateConsumptionPath cuts spending to income once the money runs out.
 */
const NFL = {
  startAge: 23,
  careerYears: 6,
  careerEarnings: 3_200_000,
  salary: 3_200_000 / 6,
  afterIncome: 50_000,
  afterUntil: 67,
  retirementIncome: 20_000,
  endAge: 90,
  /** Share of each playing-year paycheck spent on the failure paths. */
  trackSpendShare: 0.75,
  /** Post-career spending, "stays high" path: half the playing lifestyle. */
  trackSpendAfter: (3_200_000 / 6) * 0.75 * 0.5,
  /** Post-career spending, "overextends" path: the full playing lifestyle. */
  trackSpendFull: (3_200_000 / 6) * 0.75,
  /**
   * On the stays-high path, spending continues on borrowed money after the
   * savings are gone; bankruptcy is filed when debts reach two years of the
   * lifestyle (stylized, like the spending rule itself).
   */
  debtLimit: (3_200_000 / 6) * 0.75 * 0.5 * 2,
}

function CaseStudy({ realRatePct }: { realRatePct: number }) {
  // The failure path shown against the plan: spending cut only halfway after
  // the career, spending never cut at all (overextending), or spending that
  // simply tracks income.
  const [spending, setSpending] = useState<'high' | 'overextend' | 'tracks'>('high')

  const { results, tracked } = useMemo(() => {
    const incomes: number[] = []
    for (let age = NFL.startAge; age < NFL.endAge; age++) {
      if (age < NFL.startAge + NFL.careerYears) incomes.push(NFL.salary)
      else if (age < NFL.afterUntil) incomes.push(NFL.afterIncome)
      else incomes.push(NFL.retirementIncome)
    }
    const desired = incomes.map((y, k) => {
      if (spending === 'tracks') return y
      if (k < NFL.careerYears) return y * NFL.trackSpendShare
      return spending === 'overextend' ? NFL.trackSpendFull : NFL.trackSpendAfter
    })
    return {
      results: computeFromIncomes(incomes, NFL.startAge, realRatePct, false),
      tracked: simulateConsumptionPath(incomes, desired, NFL.startAge, realRatePct, {
        debtLimit: spending === 'tracks' ? 0 : NFL.debtLimit,
      }),
    }
  }, [realRatePct, spending])

  const cliff = 1 - NFL.afterIncome / NFL.salary
  const retireAge = NFL.startAge + NFL.careerYears
  const goesBankrupt = spending !== 'tracks'
  const compareLabel =
    spending === 'high'
      ? 'If spending stays high'
      : spending === 'overextend'
        ? 'If spending never falls'
        : 'If spending tracks income'
  const redDashText =
    spending === 'high'
      ? `spending cut only to half the playing lifestyle (${formatUSDWhole(NFL.trackSpendAfter)} a year), on savings and then debt, until bankruptcy`
      : spending === 'overextend'
        ? `spending held at the full playing lifestyle (${formatUSDWhole(NFL.trackSpendFull)} a year), on savings and then debt, until bankruptcy`
        : 'spending that simply tracks income, falling off the same cliff the paychecks do'

  return (
    <>
      <StepHeader
        title="A six-year career, a sixty-year life"
        hint="A professional football player earns most of a lifetime's income in a few years: the most extreme income hump there is."
      />

      <div className={styles.modeRow}>
        <SegmentedControl
          label="Instead of smoothing, suppose spending"
          options={[
            { value: 'high', label: 'Stays high' },
            { value: 'overextend', label: 'Overextends' },
            { value: 'tracks', label: 'Tracks income' },
          ]}
          value={spending}
          onChange={setSpending}
        />
      </div>

      <div className={styles.stats}>
        <Stat label={`Career earnings over ${NFL.careerYears} years`} value={NFL.careerEarnings} format={formatUSDWhole} accentColor="var(--c-series-3)" />
        <Stat label="Smoothing plan, spending for life" value={results.smoothedConsumption} format={formatUSDWhole} emphasis accentColor={GREEN} />
        {goesBankrupt ? (
          <Stat
            label="Bankrupt"
            value={tracked.brokeAge ?? NFL.endAge}
            format={(v) => `age ${Math.round(v)}`}
            accentColor={CARDINAL}
            animate={false}
          />
        ) : (
          <Stat
            label="Saved by career's end"
            value={tracked.points.find((p) => p.age === retireAge)?.wealth ?? 0}
            format={formatUSDWhole}
            accentColor={CARDINAL}
            animate={false}
          />
        )}
      </div>

      <LifeCycleChart
        points={results.points}
        retireAge={retireAge}
        compare={tracked.points}
        compareLabel={compareLabel}
        exportStats={[
          { label: `Career earnings, ${NFL.careerYears} years`, value: formatUSDWhole(NFL.careerEarnings), color: 'var(--c-series-3)' },
          { label: 'Smoothing plan, for life', value: formatUSDWhole(results.smoothedConsumption), color: GREEN },
        ]}
        caption={`A ${NFL.careerYears}-year career at ${formatUSDWhole(NFL.salary)} a year (grey), in year-2000 dollars. Green: the smoothing plan, ${formatUSDWhole(results.smoothedConsumption)} a year for life. Red dashed: ${redDashText}.`}
      />
      <WealthChart
        points={results.points}
        peakAge={results.peakWealthAge}
        compare={tracked.points}
        compareLabel={compareLabel}
        brokeAge={tracked.brokeAge}
        brokeLabel="bankrupt"
        exportStats={[
          { label: `Plan net worth at ${results.peakWealthAge}`, value: formatUSDWhole(results.peakWealth), color: AMBER },
          goesBankrupt
            ? { label: 'Bankrupt', value: `age ${tracked.brokeAge ?? NFL.endAge}`, color: CARDINAL }
            : { label: "Saved by career's end", value: formatUSDWhole(tracked.points.find((p) => p.age === retireAge)?.wealth ?? 0), color: CARDINAL },
        ]}
        caption={
          goesBankrupt
            ? `Net worth under each path. The plan (amber) peaks at ${formatUSDWhole(results.peakWealth)} and lasts to ${NFL.endAge}. The ${spending === 'overextend' ? 'overextended' : 'high-spending'} path (red dashed) leaves the league with ${formatUSDWhole(tracked.points.find((p) => p.age === retireAge)?.wealth ?? 0)}, ${spending === 'overextend' ? `and keeps spending ${formatUSDWhole(NFL.trackSpendFull)} a year` : 'burns through it, then borrows'} until bankruptcy at ${tracked.brokeAge}; the filing wipes the debt and net worth resets to zero.`
            : `Net worth under each path. The plan (amber) peaks at ${formatUSDWhole(results.peakWealth)} and lasts to ${NFL.endAge}. Tracking income saves nothing: the red dashed line never leaves zero.`
        }
      />

      <Callout tone="mark" label="What the research found">
        The median player drafted 1996 to 2003 earned about <strong>$3.2 million</strong> over{' '}
        {NFL.careerYears} years, then income fell roughly <strong>{Math.round(cliff * 100)}%</strong>{' '}
        (Carlson, Kim, Lusardi, and Camerer 2015). Spending like the red paths led to bankruptcy
        quickly: <strong>1.9%</strong> of players filed within 2 years of retiring,{' '}
        <strong>15.7%</strong> by year 12. Longer, richer careers offered little protection.
      </Callout>
      <Callout tone="note" label="The lesson">
        A saver on the green plan essentially never goes bankrupt in the study&rsquo;s simulations.
        Professor Lusardi&rsquo;s conclusion: <strong>consumption should not track income</strong>,
        for a football player or for anyone. Only the size of the income hump differs.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function MathView({
  state,
  results: r,
}: {
  state: LifeCycleState
  results: ReturnType<typeof computeLifeCycle>
}) {
  const T = state.endAge - state.startAge
  return (
    <>
      <StepHeader
        title="Why consumption is constant"
        hint="Modigliani's result (1954, Nobel Prize 1985): choose the steady spending level whose lifetime cost equals lifetime income."
      />
      <FormulaBlock
        tex={`\\sum_{t=1}^{T} \\frac{c}{(1+r)^{t}} \\;=\\; \\sum_{t=1}^{T} \\frac{y_t}{(1+r)^{t}}`}
        caption="The lifetime budget constraint: the present value of consumption must equal the present value of income, with no bequest."
      />
      <FormulaBlock
        tex={`c \\;=\\; PV \\cdot \\frac{r}{1-(1+r)^{-T}} \\;=\\; \\boxed{${texUSD(r.smoothedConsumption)}}`}
        caption={`With these inputs, PV = ${formatUSDWhole(r.lifetimeIncomePV)}, T = ${T} years, and r = ${state.realRatePct}%. This is the annuity formula from the Time Value of Money lesson: lifetime income paid back in equal installments.`}
      />
      <FormulaBlock
        tex={`W_{t+1} = W_t(1+r) + y_t - c`}
        caption="Each year the whole balance W earns interest, and then the year's saving (income minus consumption) is added. New saving joins the principal and compounds in every later year. Wealth peaks at retirement and reaches exactly zero at the planning horizon."
        muted
      />
      <Callout tone="note" label="Check it yourself">
        With no growth the formula is just <em>c = lifetime income ÷ years</em>. Set the return on
        savings to zero and the green line lands on that simple average; raise it and c climbs.
        However you move the sliders, wealth ends at zero: the model spends the last dollar on the
        last day, by design.
      </Callout>
    </>
  )
}
