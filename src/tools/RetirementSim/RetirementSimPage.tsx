import { useMemo, useState } from 'react'
import { Callout, Card, MathSection, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared with Chance & Ownership: same lesson family, same chart canvas.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import {
  ACCOUNT_RULES,
  CONTRIBUTION_LIMITS,
  MATCH_CAP,
  MATCH_RETURN,
  MATCH_TAX,
  PLAN_START_AGE,
  R_RETIRED,
  R_SAVE,
  RETIRE_AGE,
  RETIREMENT_YEARS,
  TAX_YEAR,
  jarSeries,
  matchScenarios,
  planOutcome,
  savingFor,
  waitingCurve,
} from './compute'
import styles from './RetirementSimPage.module.css'

/*
 * The tax-and-retirement lesson family, ported from Matt's
 * retirement-planning-simulator.jsx prototype onto the design system.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'

/* Full-width figures: wider than the two-column original, so also taller. */
const CHART_RATIO = 0.5
const CHART_MAX_HEIGHT = 560

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`

/* KaTeX fragments for the worked math: whole dollars and decimal rates. */
const texUSD = (v: number) => `\\$${Math.round(v).toLocaleString('en-US')}`
const texRate = (p: number) => String(p / 100)

/* ================= Part 2: Account Taxation ================= */

function AccountTaxation() {
  const [earn, setEarn] = useState(3600)
  const [years, setYears] = useState(40)
  const [ret, setRet] = useState(6)
  const [taxNow, setTaxNow] = useState(30)
  const [taxLater, setTaxLater] = useState(30)

  const rows = useMemo(
    () => jarSeries(earn, years, ret / 100, taxNow / 100, taxLater / 100),
    [earn, years, ret, taxNow, taxLater]
  )
  const last = rows[rows.length - 1]!
  const x = rows.map((r) => r.year)
  const yMax = Math.max(last.taxable, last.traditional, last.roth) * 1.1

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        The same {formatUSDWhole(earn)} of earnings goes into three accounts every year: the
        taxable account is taxed going in and on every year&rsquo;s returns, the traditional
        401(k) once at withdrawal, the Roth once going in.
      </p>
      <div className={styles.controlsRow}>
        <Slider
          label="Contribution per year"
          value={earn}
          onChange={setEarn}
          min={500}
          max={15000}
          step={100}
          editable
          prefix="$"
          suffix="/yr"
          inputMax={50_000}
        />
        <Slider label="Years invested" value={years} onChange={setYears} min={5} max={45} step={1} editable suffix="yrs" plain />
        <Slider label="Annual return" value={ret} onChange={setRet} min={2} max={10} step={0.5} editable suffix="%" precision={1} />
        <Slider label="Tax rate today" value={taxNow} onChange={setTaxNow} min={0} max={50} step={1} editable suffix="%" />
        <Slider label="Tax rate in retirement" value={taxLater} onChange={setTaxLater} min={0} max={50} step={1} editable suffix="%" />
      </div>
      <div className={styles.stats}>
        <Stat label="Taxable (taxed twice)" value={last.taxable} format={formatUSDWhole} accentColor={SLATE} animate={false} />
        <Stat label="Traditional (taxed on exit)" value={last.traditional} format={formatUSDWhole} accentColor={GOLD} animate={false} />
        <Stat label="Roth (taxed on entry)" value={last.roth} format={formatUSDWhole} accentColor={RED} animate={false} />
      </div>
      <div>
        <div className={styles.legend}>
          <span style={{ color: RED }}>&#9632; Roth</span>
          <span style={{ color: GOLD }}>&#9632; Traditional 401(k)/IRA</span>
          <span style={{ color: SLATE }}>&#9632; taxable account</span>
        </div>
        <StationChart
          x={x}
          yMax={yMax}
          ratio={CHART_RATIO}
          maxHeight={CHART_MAX_HEIGHT}
          lines={[
            { ys: rows.map((r) => r.taxable), color: SLATE, width: 2, label: 'Taxable account' },
            { ys: rows.map((r) => r.traditional), color: GOLD, width: 3, label: 'Traditional 401(k)/IRA' },
            { ys: rows.map((r) => r.roth), color: RED, width: 3, label: 'Roth' },
          ]}
          xTickFormat={(v) => `${Math.round(v)} yr`}
          xHoverLabel={(v) => `Year ${Math.round(v)}`}
          figure="Figure 1."
          caption={`After-tax value of ${formatUSDWhole(earn)} of earnings saved each year in each account. The taxable account's returns are taxed every year at the retirement rate, a simplification: real brokerage accounts pay lower capital-gains rates and defer tax on gains until sale.`}
          ariaLabel="After-tax value of taxable, traditional, and Roth accounts over time"
          exportStats={[
            { label: 'Taxable', value: formatUSDWhole(last.taxable), color: SLATE },
            { label: 'Traditional', value: formatUSDWhole(last.traditional), color: GOLD },
            { label: 'Roth', value: formatUSDWhole(last.roth), color: RED },
          ]}
        />
      </div>
      <Callout tone="mark" label="Comparing the three accounts">
        With equal tax rates today and in retirement, traditional and Roth tie; whichever period
        has the lower rate favors that account. The taxable account trails both because yearly
        taxes slow its compounding.
      </Callout>

      <div>
        <p className={styles.rulesTitle}>
          The rules that come with each account ({TAX_YEAR}, single filer)
        </p>
        <div className={styles.rulesScroll}>
          <table className={styles.rulesTable}>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">How much can go in per year</th>
                <th scope="col">Income restrictions</th>
                <th scope="col">Getting money out</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Traditional 401(k)</th>
                <td>
                  {formatUSDWhole(CONTRIBUTION_LIMITS.k401)} of wages, plus{' '}
                  {formatUSDWhole(ACCOUNT_RULES.k401CatchUp50)} from age 50
                </td>
                <td>None; any income level, but only through an employer that offers a plan</td>
                <td>
                  Withdrawals are taxed as income; 10% penalty before age{' '}
                  {ACCOUNT_RULES.earlyWithdrawalAge}; withdrawals required from age{' '}
                  {ACCOUNT_RULES.rmdAge}
                </td>
              </tr>
              <tr>
                <th scope="row">Traditional IRA</th>
                <td>
                  {formatUSDWhole(CONTRIBUTION_LIMITS.ira)} across all IRAs combined, plus{' '}
                  {formatUSDWhole(ACCOUNT_RULES.iraCatchUp50)} from age 50; never more than the
                  year&rsquo;s earned income
                </td>
                <td>
                  Anyone with earned income can contribute, but the tax deduction phases out
                  between {formatUSDWhole(ACCOUNT_RULES.tradIraDeductionPhaseOut.single.from)} and{' '}
                  {formatUSDWhole(ACCOUNT_RULES.tradIraDeductionPhaseOut.single.to)} of income for
                  workers covered by a plan at work
                </td>
                <td>
                  Withdrawals are taxed as income; 10% penalty before age{' '}
                  {ACCOUNT_RULES.earlyWithdrawalAge}; withdrawals required from age{' '}
                  {ACCOUNT_RULES.rmdAge}
                </td>
              </tr>
              <tr>
                <th scope="row">Roth IRA</th>
                <td>Shares the same {formatUSDWhole(CONTRIBUTION_LIMITS.ira)} IRA limit</td>
                <td>
                  Contributions phase out between{' '}
                  {formatUSDWhole(ACCOUNT_RULES.rothIraPhaseOut.single.from)} and{' '}
                  {formatUSDWhole(ACCOUNT_RULES.rothIraPhaseOut.single.to)} of income; above that,
                  direct contributions are not allowed
                </td>
                <td>
                  Contributions come back out anytime, tax-free; earnings taken before age{' '}
                  {ACCOUNT_RULES.earlyWithdrawalAge} owe tax plus the 10% penalty; no required
                  withdrawals
                </td>
              </tr>
              <tr>
                <th scope="row">Taxable account</th>
                <td>No limit</td>
                <td>None</td>
                <td>Money out anytime; the trade-off is the yearly tax on returns shown above</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          Limits are for {TAX_YEAR} (IRS Notice 2025-67) and rise most years with inflation.
          Married-couple phase-out ranges are higher.
        </p>
      </div>

      <MathSection
        hint="All three jars are the same annuity future value; only where the tax lands differs. Evaluated with the sliders' current values."
        rows={(() => {
          const r2 = +((ret / 100) * (1 - taxLater / 100)).toFixed(6)
          return [
            {
              tex: `FV = PMT \\times \\frac{(1 + r)^{Y} - 1}{r}`,
              caption: `Future value of a yearly deposit PMT after Y = ${years} years at the return r. Each account changes only the deposit or the rate.`,
            },
            {
              tex: `\\text{Roth} = ${texUSD(earn)}(1 - ${texRate(taxNow)}) \\times \\frac{(1 + ${texRate(ret)})^{${years}} - 1}{${texRate(ret)}} = \\boxed{${texUSD(last.roth)}}`,
              caption: 'Taxed once going in: the deposit shrinks, then compounds untouched.',
              muted: true,
            },
            {
              tex: `\\text{Traditional} = ${texUSD(earn)} \\times \\frac{(1 + ${texRate(ret)})^{${years}} - 1}{${texRate(ret)}} \\times (1 - ${texRate(taxLater)}) = \\boxed{${texUSD(last.traditional)}}`,
              caption: 'Taxed once at withdrawal: the full deposit compounds, then the exit tax takes its share.',
              muted: true,
            },
            {
              tex: `\\text{Taxable} = ${texUSD(earn)}(1 - ${texRate(taxNow)}) \\times \\frac{(1 + ${r2})^{${years}} - 1}{${r2}} = \\boxed{${texUSD(last.taxable)}}`,
              caption: `Taxed going in and on every year's returns, so it compounds at the reduced rate r(1 - t) = ${r2}. That drag is the whole gap in Figure 1.`,
              muted: true,
            },
          ]
        })()}
      />
    </div>
  )
}

/* ================= Part 3: Employer Matching ================= */

function EmployerMatching() {
  const [salary, setSalary] = useState(60000)
  const [contribPct, setContribPct] = useState(6)
  const [years, setYears] = useState(40)
  // Percent sliders hold e.g. 6, not 0.06; round off float dust (0.035 * 100 = 3.5000...04).
  const [retPct, setRetPct] = useState(Math.round(MATCH_RETURN * 1000) / 10)

  const rows = useMemo(
    () => matchScenarios(salary, contribPct / 100, years, retPct / 100),
    [salary, contribPct, years, retPct]
  )
  const last = rows[rows.length - 1]!
  const x = rows.map((r) => r.year)
  const yMax = last.fullMatch * 1.1

  const contrib = (contribPct / 100) * salary
  const matched = Math.min(contribPct / 100, MATCH_CAP) * salary
  const capped = contribPct / 100 > MATCH_CAP

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        The employer adds 50 cents (or a dollar) for each dollar you contribute, on the first{' '}
        {pct(MATCH_CAP)} of salary.
      </p>
      <div className={styles.controlsRow}>
        <Slider label="Salary" value={salary} onChange={setSalary} min={25000} max={150000} step={1000} editable prefix="$" inputMax={500_000} />
        <Slider
          label="Your contribution"
          value={contribPct}
          onChange={setContribPct}
          min={1}
          max={15}
          step={0.5}
          editable
          suffix="%"
          precision={1}
          note={`${formatUSDWhole(contrib)}/yr`}
        />
        <Slider label="Years invested" value={years} onChange={setYears} min={10} max={45} step={1} editable suffix="yrs" plain />
        <Slider label="Annual return" value={retPct} onChange={setRetPct} min={2} max={10} step={0.5} editable suffix="%" precision={1} />
      </div>
      {capped && (
        <p className={styles.note}>
          The match stops at {pct(MATCH_CAP)} of salary, so the employer adds money on{' '}
          {formatUSDWhole(matched)} of your {formatUSDWhole(contrib)}.
        </p>
      )}
      <div className={styles.stats}>
        <Stat label={`Taxable account, after ${years} yrs`} value={last.taxable} format={formatUSDWhole} accentColor={SLATE} animate={false} />
        <Stat label="401(k), no match" value={last.noMatch} format={formatUSDWhole} accentColor={GOLD} animate={false} />
        <Stat label="401(k) + 50% match" value={last.halfMatch} format={formatUSDWhole} accentColor={RED} animate={false} />
        <Stat label="401(k) + 100% match" value={last.fullMatch} format={formatUSDWhole} accentColor={GREEN} emphasis animate={false} />
      </div>
      <div>
        <div className={styles.legend}>
          <span style={{ color: GREEN }}>&#9632; 401(k) + 100% match</span>
          <span style={{ color: RED }}>&#9632; 401(k) + 50% match</span>
          <span style={{ color: GOLD }}>&#9632; 401(k), no match</span>
          <span style={{ color: SLATE }}>&#9632; taxable account</span>
        </div>
        <StationChart
          x={x}
          yMax={yMax}
          ratio={CHART_RATIO}
          maxHeight={CHART_MAX_HEIGHT}
          lines={[
            { ys: rows.map((r) => r.taxable), color: SLATE, width: 2, label: 'Taxable account' },
            { ys: rows.map((r) => r.noMatch), color: GOLD, width: 3, label: '401(k), no match' },
            { ys: rows.map((r) => r.halfMatch), color: RED, width: 3, label: '401(k) + 50% match' },
            { ys: rows.map((r) => r.fullMatch), color: GREEN, width: 3, label: '401(k) + 100% match' },
          ]}
          xTickFormat={(v) => `${Math.round(v)} yr`}
          xHoverLabel={(v) => `Year ${Math.round(v)}`}
          figure="Figure 1."
          caption={`After-tax value of saving ${pct(contribPct / 100)} of a ${formatUSDWhole(salary)} salary each year at a ${pct(retPct / 100, retPct % 1 ? 1 : 0)} return, with a ${pct(MATCH_TAX)} tax rate today and at withdrawal. The taxable account's returns are taxed every year; the 401(k) scenarios are taxed once, at withdrawal.`}
          ariaLabel="After-tax value of a taxable account and a 401(k) with no match, a 50% match, and a 100% match over time"
          exportStats={[
            { label: 'Taxable', value: formatUSDWhole(last.taxable), color: SLATE },
            { label: 'No match', value: formatUSDWhole(last.noMatch), color: GOLD },
            { label: '50% match', value: formatUSDWhole(last.halfMatch), color: RED },
            { label: '100% match', value: formatUSDWhole(last.fullMatch), color: GREEN },
          ]}
        />
      </div>
      <Callout tone="mark" label="The match multiplies the whole balance">
        Every matched dollar rides the same compounding as your own, which is why the standard
        advice is to contribute at least up to the cap before saving anywhere else. Roughly 1 in 4
        employees with a match stops short of the full amount (Financial Engines, 2015).
      </Callout>

      <MathSection
        hint="Each scenario is one annuity future value; the match only raises the yearly deposit. Evaluated with the sliders' current values."
        rows={[
          {
            tex: `\\text{after tax} = (\\text{you} + \\text{match}) \\times \\frac{(1 + r)^{Y} - 1}{r} \\times (1 - ${texRate(MATCH_TAX * 100)})`,
            caption: `Yearly deposits compound for Y = ${years} years at r = ${texRate(retPct)}, then the ${pct(MATCH_TAX)} withdrawal tax comes off once. You contribute ${formatUSDWhole(contrib)}/yr; the match lands on ${formatUSDWhole(matched)} of it.`,
          },
          {
            tex: `\\text{100\\% match} = (${texUSD(contrib)} + ${texUSD(matched)}) \\times \\frac{(1 + ${texRate(retPct)})^{${years}} - 1}{${texRate(retPct)}} \\times ${texRate((1 - MATCH_TAX) * 100)} = \\boxed{${texUSD(last.fullMatch)}}`,
            caption: 'A dollar per contributed dollar, on contributions up to 6% of salary. The 50% match replaces the second term with half of it.',
            muted: true,
          },
          {
            tex: `\\text{no match} = ${texUSD(contrib)} \\times \\frac{(1 + ${texRate(retPct)})^{${years}} - 1}{${texRate(retPct)}} \\times ${texRate((1 - MATCH_TAX) * 100)} = \\boxed{${texUSD(last.noMatch)}}`,
            caption: 'The same saving with no employer money. Everything separating this line from the one above was free.',
            muted: true,
          },
        ]}
      />
    </div>
  )
}

/* ================= Part 4: Retirement Timing ================= */

function RetirementTiming() {
  // Step 1: the retirement to fund.
  const [income, setIncome] = useState(70000)
  const [retYears, setRetYears] = useState(RETIREMENT_YEARS)
  // 0.035 * 100 = 3.5000...04 in floating point; round to the slider's own precision.
  const [retiredPct, setRetiredPct] = useState(Math.round(R_RETIRED * 1000) / 10)
  // Step 2: the working years that build it.
  const [startAge, setStartAge] = useState(PLAN_START_AGE)
  const [retireAge, setRetireAge] = useState(RETIRE_AGE)
  const [saved, setSaved] = useState(0)
  const [savePct, setSavePct] = useState(Math.round(R_SAVE * 1000) / 10)
  const [actualPct, setActualPct] = useState(5)

  const planYears = retireAge - startAge
  const plan = useMemo(
    () =>
      planOutcome(
        income,
        actualPct / 100,
        retYears,
        retiredPct / 100,
        savePct / 100,
        startAge,
        retireAge,
        saved
      ),
    [income, actualPct, retYears, retiredPct, savePct, startAge, retireAge, saved]
  )
  const waiting = useMemo(
    () => waitingCurve(plan.target, savePct / 100, retireAge, saved),
    [plan.target, savePct, retireAge, saved]
  )
  // Today's savings already cover the whole target on their own.
  const funded = plan.saving === 0 && plan.grown >= plan.target

  const waitX = waiting.map((r) => r.age)
  const waitY = waiting.map((r) => r.saving)
  // Same whole-dollar rounding and remaining-target logic as the plan's own saving.
  const priceAt = (age: number) => {
    const g = savePct / 100
    const grownAt = saved * Math.pow(1 + g, retireAge - age)
    return Math.round(savingFor(Math.max(0, plan.target - grownAt), retireAge - age, g))
  }
  const waitRatio = priceAt(40) / priceAt(25)
  const plannedPct = pct(savePct / 100, savePct % 1 ? 1 : 0)

  const planX = plan.rows.map((r) => r.age)
  const planEnd = plan.rows[plan.rows.length - 1]!
  const planYMax = Math.max(plan.target, planEnd.plan, planEnd.actual) * 1.15

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Retirement planning is two time-value calculations. Step 1: choose the retirement, and
        compute the savings that fund it. Step 2: choose when the saving starts and when it ends,
        and compute the annual amount that gets there by {retireAge}.
      </p>

      <div>
        <p className={styles.rulesTitle}>Step 1: the retirement to fund</p>
        <p className={styles.sectionLede}>
          A couple wants {formatUSDWhole(income)} a year for {retYears} years, withdrawing safely
          at {pct(retiredPct / 100, 1)} growth in retirement.
        </p>
      </div>
      <div className={styles.controlsRow}>
        <Slider
          label="Retirement income goal"
          value={income}
          onChange={setIncome}
          min={40000}
          max={150000}
          step={5000}
          editable
          prefix="$"
          suffix="/yr"
          inputMax={500_000}
        />
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
        <Slider
          label="Return while withdrawing"
          value={retiredPct}
          onChange={setRetiredPct}
          min={2}
          max={5}
          step={0.5}
          editable
          suffix="%"
          precision={1}
        />
      </div>
      <div className={styles.stats}>
        <Stat label={`Savings needed at ${retireAge}`} value={plan.target} format={formatUSDWhole} accentColor={GOLD} emphasis animate={false} />
      </div>

      <div>
        <p className={styles.rulesTitle}>Step 2: the working years that build it</p>
        <p className={styles.sectionLede}>
          Choose the starting age, the retirement age, anything already saved, and the return while
          working; the long horizon supports planning around {plannedPct}. The curve shows the
          annual price of the same target from every starting age.
        </p>
      </div>
      <div className={styles.controlsRow}>
        <Slider
          label="Age saving starts"
          value={startAge}
          onChange={setStartAge}
          min={25}
          max={45}
          step={1}
          editable
          prefix="age"
          plain
        />
        <Slider
          label="Retire at age"
          value={retireAge}
          onChange={setRetireAge}
          min={55}
          max={75}
          step={1}
          editable
          prefix="age"
          plain
        />
        <Slider
          label="Already saved today"
          value={saved}
          onChange={setSaved}
          min={0}
          max={500000}
          step={5000}
          editable
          prefix="$"
          inputMax={5_000_000}
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
      </div>
      <div className={styles.stats}>
        <Stat label="Working years" value={planYears} format={(v) => `${Math.round(v)} yrs`} animate={false} />
        <Stat
          label={`Saving per year from ${startAge}`}
          value={plan.saving}
          format={formatUSDWhole}
          emphasis
          animate={false}
        />
      </div>
      {funded && (
        <p className={styles.note}>
          At {plannedPct}, the {formatUSDWhole(saved)} already saved grows past the target on its
          own, so the required yearly saving is zero. The plan still assumes that balance stays
          invested until {retireAge}.
        </p>
      )}
      <div>
        <div className={styles.legend}>
          <span style={{ color: GOLD }}>&#9632; annual saving by starting age</span>
          <span style={{ color: RED }}>&#9476; your starting age</span>
        </div>
        <StationChart
          x={waitX}
          yMax={Math.max(waitY[waitY.length - 1]!, 1000) * 1.1}
          ratio={CHART_RATIO}
          maxHeight={CHART_MAX_HEIGHT}
          xRef={startAge}
          xRefLabel="you"
          lines={[{ ys: waitY, color: GOLD, width: 3, label: 'Annual saving needed' }]}
          xTickFormat={(v) => `age ${Math.round(v)}`}
          xHoverLabel={(v) => `Start at ${Math.round(v)}`}
          figure="Figure 1."
          caption={`Annual saving that reaches ${formatUSDWhole(plan.target)} by ${retireAge} at a ${plannedPct} return, by starting age${saved > 0 ? `, after what the ${formatUSDWhole(saved)} already saved grows to from each age` : ''}. ${
            priceAt(25) > 0
              ? `Waiting from 25 to 40 multiplies the annual price by ${waitRatio.toFixed(1)}, and each further year of waiting costs more than the last.`
              : 'From the earliest starting ages the existing balance covers the goal by itself; waiting is what brings back a yearly price.'
          }`}
          ariaLabel={`Annual saving needed to reach the target by ${retireAge}, as a function of starting age`}
          exportStats={[
            { label: 'Start at 25', value: `${formatUSDWhole(priceAt(25))}/yr`, color: GREEN },
            { label: 'Start at 30', value: `${formatUSDWhole(priceAt(30))}/yr`, color: GOLD },
            { label: 'Start at 40', value: `${formatUSDWhole(priceAt(40))}/yr`, color: RED },
          ]}
        />
      </div>

      <div>
        <p className={styles.rulesTitle}>What if returns disappoint?</p>
        <p className={styles.sectionLede}>
          The plan assumes {plannedPct} a year. Move the actual return and watch where the same{' '}
          {formatUSDWhole(plan.saving)} of yearly saving lands.
        </p>
      </div>
      <div className={styles.controlsRow}>
        <Slider
          label="Actual return while saving"
          value={actualPct}
          onChange={setActualPct}
          min={4}
          max={8}
          step={0.5}
          editable
          suffix="%"
          precision={1}
        />
      </div>
      <div className={styles.stats}>
        <Stat label={`Planned at ${plannedPct}`} value={planEnd.plan} format={formatUSDWhole} accentColor={GOLD} animate={false} />
        <Stat label={`Actual at ${actualPct}%`} value={planEnd.actual} format={formatUSDWhole} accentColor={actualPct < savePct ? RED : GREEN} animate={false} />
        <Stat
          label="Retirement income it funds"
          value={plan.actualIncome}
          format={(v) => `${formatUSDWhole(v)}/yr`}
          accentColor={actualPct < savePct ? RED : GREEN}
          emphasis
          animate={false}
        />
      </div>
      <p className={styles.note}>
        {actualPct < savePct
          ? `The balance falls short, and the income it funds falls to ${formatUSDWhole(plan.actualIncome)} instead of ${formatUSDWhole(income)}.`
          : actualPct === savePct
            ? 'Returns came in as planned, and the balance funds the goal.'
            : 'Returns beat the plan.'}
      </p>
      <div>
        <div className={styles.legend}>
          <span style={{ color: GOLD }}>&#9632; planned at {plannedPct}</span>
          <span style={{ color: actualPct < savePct ? RED : GREEN }}>&#9632; actual at {actualPct}%</span>
        </div>
        <StationChart
          x={planX}
          yMax={planYMax}
          ratio={CHART_RATIO}
          maxHeight={CHART_MAX_HEIGHT}
          yRef={plan.target}
          refLabel="the savings the plan needs"
          lines={[
            { ys: plan.rows.map((r) => r.plan), color: GOLD, width: 3, label: `Planned at ${plannedPct}` },
            { ys: plan.rows.map((r) => r.actual), color: actualPct < savePct ? RED : GREEN, width: 3, label: `Actual at ${actualPct}%` },
          ]}
          xTickFormat={(v) => `age ${Math.round(v)}`}
          xHoverLabel={(v) => `Age ${Math.round(v)}`}
          figure="Figure 2."
          caption={`Saving ${formatUSDWhole(plan.saving)} a year from ${startAge} to ${retireAge}${saved > 0 ? `, on top of the ${formatUSDWhole(saved)} starting balance` : ''}, compounded at the planned ${plannedPct} and at ${actualPct}%. The withdrawal portfolio is assumed to move by the same margin in the same direction (${pct(plan.retiredR, 1)} instead of ${pct(retiredPct / 100, 1)}), so the income the balance funds moves even more than the balance.`}
          ariaLabel="Accumulation under the planned return versus the actual return"
          exportStats={[
            { label: `Planned at ${plannedPct}`, value: formatUSDWhole(planEnd.plan), color: GOLD },
            { label: `Actual at ${actualPct}%`, value: formatUSDWhole(planEnd.actual), color: actualPct < savePct ? RED : GREEN },
            { label: 'Income it funds', value: `${formatUSDWhole(plan.actualIncome)}/yr` },
          ]}
        />
      </div>
      <Callout tone="mark" label="A retirement plan is adjusted over time">
        Save more than the minimum so the plan carries a buffer, recheck the balance every few
        years, and adjust the contribution.
      </Callout>

      <MathSection
        hint="Both steps are one time-value-of-money formula each, evaluated here with the sliders' current values."
        rows={[
          {
            tex: '\\text{Step 1: target} = \\text{income} \\times \\frac{1 - (1 + r)^{-n}}{r}',
            caption: `Present value of n years of withdrawals at the return r of the safer withdrawal portfolio. Here r = ${texRate(retiredPct)} and n = ${retYears}.`,
          },
          {
            tex: `${texUSD(income)} \\times \\frac{1 - (1 + ${texRate(retiredPct)})^{-${retYears}}}{${texRate(retiredPct)}} = \\boxed{${texUSD(plan.target)}}`,
            caption: `On the TVM calculator: N = ${retYears}, I/Y = ${retiredPct}, PMT = ${Math.round(income).toLocaleString('en-US')}, FV = 0; solve for PV.`,
            muted: true,
          },
          {
            tex:
              saved > 0
                ? '\\text{Step 2: saving} = \\left(\\text{target} - \\text{saved}\\,(1 + g)^{N}\\right) \\times \\frac{g}{(1 + g)^{N} - 1}'
                : '\\text{Step 2: saving} = \\text{target} \\times \\frac{g}{(1 + g)^{N} - 1}',
            caption: `The level yearly saving whose future value${saved > 0 ? `, on top of what today's savings grow to,` : ''} reaches the target after N years at the working return g. Here g = ${texRate(savePct)} and N = ${planYears}, and the result rounds to whole dollars.`,
          },
          funded
            ? {
                tex: `${texUSD(plan.grown)} \\ge ${texUSD(plan.target)} \\;\\Rightarrow\\; \\text{saving} = \\boxed{\\$0}`,
                caption: `What the ${formatUSDWhole(saved)} already saved grows to by ${retireAge} exceeds the target on its own, so the plan needs no new yearly saving.`,
                muted: true,
              }
            : {
                tex:
                  saved > 0
                    ? `\\left(${texUSD(plan.target)} - ${texUSD(plan.grown)}\\right) \\times \\frac{${texRate(savePct)}}{(1 + ${texRate(savePct)})^{${planYears}} - 1} = \\boxed{${texUSD(plan.saving)}}`
                    : `${texUSD(plan.target)} \\times \\frac{${texRate(savePct)}}{(1 + ${texRate(savePct)})^{${planYears}} - 1} = \\boxed{${texUSD(plan.saving)}}`,
                caption: `On the TVM calculator: N = ${planYears}, I/Y = ${savePct}, PV = ${saved > 0 ? `-${Math.round(saved).toLocaleString('en-US')}` : 0}, FV = ${Math.round(plan.target).toLocaleString('en-US')}; solve for PMT.`,
                muted: true,
              },
          {
            tex:
              saved > 0
                ? `\\text{Figure 1: saving}(a) = \\left(\\text{target} - \\text{saved}\\,(1 + g)^{${retireAge} - a}\\right) \\times \\frac{g}{(1 + g)^{${retireAge} - a} - 1}`
                : `\\text{Figure 1: saving}(a) = \\text{target} \\times \\frac{g}{(1 + g)^{${retireAge} - a} - 1}`,
            caption: 'Figure 1 repeats step 2 for each starting age a, with the same step 1 target; results round to whole dollars and clamp at zero once the existing balance covers the goal.',
          },
          {
            tex: `\\text{Figure 2: balance at } r_a = \\text{saving} \\times \\frac{(1 + r_a)^{N} - 1}{r_a}`,
            caption: `Future value of the same saving at the actual return. At the slider's ${actualPct}%: ${formatUSDWhole(plan.saving)} grows to ${formatUSDWhole(planEnd.actual)}, and dividing by the step 1 factor at the shifted withdrawal return of ${pct(plan.retiredR, 1)} gives the ${formatUSDWhole(plan.actualIncome)} it funds.`,
          },
        ]}
      />
    </div>
  )
}

/* ============================== pages ============================== */

/*
 * The lesson family split into three tools that share the helpers above:
 * Account Taxation and Employer Matching (the tax side, formerly the Tax
 * Advantages tabs; its Take-Home Pay part merged into Understanding Taxes)
 * and the Retirement Planning Simulator (the timing side).
 */

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function AccountTaxationPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Taxes &amp; tax-advantaged saving</p>
          <h1 className={styles.h1}>Account Taxation</h1>
        </header>
      )}

      <Card tone="raised">
        <AccountTaxation />
      </Card>

      <p className={styles.footnote}>
        Contribution limits and phase-outs are for {TAX_YEAR} (IRS Notice 2025-67). The three
        accounts compound annually at the chosen rates, with the tax rates set above; the
        Understanding Taxes lesson shows where a marginal rate comes from. An illustration, not
        financial advice.
      </p>
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function EmployerMatchingPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Taxes &amp; tax-advantaged saving</p>
          <h1 className={styles.h1}>Employer Matching</h1>
        </header>
      )}

      <Card tone="raised">
        <EmployerMatching />
      </Card>

      <p className={styles.footnote}>
        The match adds 50 cents or a dollar per contributed dollar on the first {pct(MATCH_CAP)} of
        salary, and every scenario is taxed once at withdrawal at {pct(MATCH_TAX)}. Simplified
        annual compounding for teaching; an illustration, not financial advice.
      </p>
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function RetirementSimPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Planning for retirement</p>
          <h1 className={styles.h1}>Retirement Planning Simulator</h1>
        </header>
      )}

      <Card tone="raised">
        <RetirementTiming />
      </Card>

      <p className={styles.footnote}>
        The two-step method: the savings that fund a retirement income, then the level yearly saving
        that builds it, at {pct(R_SAVE)} while working and {pct(R_RETIRED, 1)} once retired over a{' '}
        {RETIREMENT_YEARS}-year retirement. Simplified annual compounding for teaching; an
        illustration, not financial advice.
      </p>
    </div>
  )
}
