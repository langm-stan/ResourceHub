import { useMemo, useState } from 'react'
import { Button, Callout, Card, NumberField, SelectField, Slider, Stat, Toggle } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared with Chance & Ownership: same lesson family, same chart canvas.
import { StationChart } from '../ChanceOwnership/components/StationChart'
// The vetted Taxes tool provides the state schedules; Part 1 reuses them.
import { computeStateTax } from '../Taxes/compute'
import { STATE_OPTIONS } from '../Taxes/stateData2026'
import {
  ACCOUNT_RULES,
  CONTRIBUTION_LIMITS,
  MATCH_CAP,
  MATCH_RETURN,
  MATCH_TAX,
  R_RETIRED,
  R_SAVE,
  RETIREMENT_YEARS,
  SS_WAGE_BASE,
  START_AGE,
  STD_DEDUCTION,
  TAX_YEAR,
  federalTax,
  fica,
  jarSeries,
  matchScenarios,
  retirementCurve,
  yearsToFree,
} from './compute'
import styles from './RetirementSimPage.module.css'

/*
 * Retirement Planning Simulator: four parts for the tax efficiency,
 * employer benefits, and retirement session, ported from Matt's
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

/* ================= Part 1: Take-Home Pay ================= */

function TakeHomePay() {
  const [salary, setSalary] = useState(60000)
  const [raiseOn, setRaiseOn] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  // Optional pieces, all off by default: the base lesson is federal brackets.
  const [withState, setWithState] = useState(false)
  const [stateCode, setStateCode] = useState('CA')
  const [withPayroll, setWithPayroll] = useState(false)
  const [with401k, setWith401k] = useState(false)
  const [k401, setK401] = useState(5000)

  const gross = raiseOn ? salary + 2000 : salary

  const taxesAt = useMemo(() => {
    return (g: number) => {
      const k = with401k ? Math.min(Math.max(0, k401), g) : 0
      const fed = federalTax(Math.max(0, g - k))
      const state = withState ? computeStateTax(g, k, 'single', stateCode) : null
      const payroll = withPayroll ? fica(g) : 0
      const total = fed.tax + (state?.tax ?? 0) + payroll
      return { k, fed, state, payroll, total, takeHome: g - k - total }
    }
  }, [with401k, k401, withState, stateCode, withPayroll])

  const cur = useMemo(() => taxesAt(gross), [taxesAt, gross])
  const raiseDelta = cur.takeHome - taxesAt(salary).takeHome
  const marginalAllIn = (taxesAt(gross + 100).total - cur.total) / 100

  const segments = useMemo(() => {
    const raw = [
      ...(cur.k > 0
        ? [{ name: '401(k) contribution', total: cur.k, taken: 0, rate: 0, invested: true }]
        : []),
      {
        name: 'standard deduction',
        total: Math.min(Math.max(0, gross - cur.k), STD_DEDUCTION),
        taken: 0,
        rate: 0,
        invested: false,
      },
      ...cur.fed.slices.map((s) => ({
        name: `${pct(s.rate)} bracket`,
        total: s.amount,
        taken: s.tax,
        rate: s.rate,
        invested: false,
      })),
    ]
    let acc = 0
    return raw.map((g) => {
      const w = gross > 0 ? (g.total / gross) * 100 : 0
      const seg = { ...g, w, center: acc + w / 2 }
      acc += w
      return seg
    })
  }, [gross, cur])
  const tip = hover != null ? segments[hover] : null

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Move the salary slider or type an exact number, and watch each dollar go through the
        federal brackets in order. The first{' '}
        {formatUSDWhole(STD_DEDUCTION)} passes untaxed (the standard deduction), and each bracket
        taxes only the dollars inside it. The toggles add the other pieces of a real paycheck when
        you want them.
      </p>
      <div className={styles.controlsRow}>
        <div className={styles.controlStack}>
          <div>
            <Slider
              label="Salary (wages, $/yr)"
              value={salary}
              onChange={setSalary}
              min={20000}
              max={250000}
              step={1000}
            />
            <NumberField value={salary} onChange={setSalary} min={0} max={2_000_000} prefix="$" precision={0} />
          </div>
          <div>
            <Button onClick={() => setRaiseOn(!raiseOn)}>
              {raiseOn ? 'Remove the $2,000 raise' : 'Give a $2,000 raise'}
            </Button>
            {raiseOn && (
              <p className={styles.raiseResult}>
                Take-home change: +{formatUSDWhole(raiseDelta)}. A raise never lowers take-home pay.
              </p>
            )}
          </div>
        </div>
        <div className={styles.controlStack}>
          <span className={styles.radioTitle}>Optional pieces</span>
          <Toggle
            label="Payroll taxes (Social Security &amp; Medicare)"
            checked={withPayroll}
            onChange={setWithPayroll}
          />
          <Toggle label="State income tax" checked={withState} onChange={setWithState} />
          {withState && (
            <SelectField label="State" value={stateCode} onChange={setStateCode} options={STATE_OPTIONS} />
          )}
          <Toggle label="401(k) contribution (pre-tax)" checked={with401k} onChange={setWith401k} />
          {with401k && (
            <NumberField
              label="401(k) contribution ($/yr)"
              value={k401}
              onChange={setK401}
              min={0}
              max={CONTRIBUTION_LIMITS.k401}
              prefix="$"
              precision={0}
            />
          )}
        </div>
      </div>
      <div className={styles.stats}>
        <Stat label="Take-home" value={cur.takeHome} format={formatUSDWhole} emphasis animate={false} />
        {cur.k > 0 && (
          <Stat label="Into the 401(k), still yours" value={cur.k} format={formatUSDWhole} accentColor={GREEN} animate={false} />
        )}
        <Stat
          label="Marginal rate (next dollar)"
          value={marginalAllIn}
          format={(v) => pct(v, 1)}
          accentColor={RED}
          animate={false}
        />
        <Stat
          label="Effective rate (taxes ÷ gross)"
          value={gross > 0 ? cur.total / gross : 0}
          format={(v) => pct(v, 1)}
          animate={false}
        />
      </div>

      <div>
        <div className={styles.legend}>
          <span style={{ color: GOLD }}>&#9632; kept</span>
          <span style={{ color: RED }}>&#9632; federal income tax</span>
          {cur.k > 0 && <span style={{ color: GREEN }}>&#9632; 401(k), still yours</span>}
        </div>
        <div className={styles.bracketWrap}>
          <div className={styles.bracketBar} onMouseLeave={() => setHover(null)}>
            {segments.map((g, i) => {
              const takenShare = g.total > 0 ? g.taken / g.total : 0
              return (
                <div
                  key={i}
                  className={styles.bracketSeg}
                  style={{ width: `${g.w}%`, ...(g.invested ? { background: GREEN } : {}) }}
                  onMouseEnter={() => setHover(i)}
                >
                  <div className={styles.bracketTax} style={{ height: `${takenShare * 100}%` }} />
                  {g.w > 7 && !g.invested && <div className={styles.bracketRate}>{pct(g.rate)}</div>}
                </div>
              )
            })}
          </div>
          {tip && (
            <div className={styles.barTip} style={{ left: `${Math.min(86, Math.max(14, tip.center))}%` }}>
              <div className={styles.barTipTitle}>{tip.name}</div>
              <div className={styles.barTipRow}>
                <span>Income in this slice</span>
                <strong className="tnum">{formatUSDWhole(tip.total)}</strong>
              </div>
              <div className={styles.barTipRow}>
                <span>Federal income tax</span>
                <strong className="tnum">{formatUSDWhole(tip.taken)}</strong>
              </div>
              <div className={styles.barTipRow}>
                <span>{tip.invested ? 'Invested, still yours' : 'Kept'}</span>
                <strong className="tnum">{formatUSDWhole(tip.total - tip.taken)}</strong>
              </div>
            </div>
          )}
        </div>
        <ul className={styles.sliceList}>
          {cur.k > 0 && (
            <li>
              First {formatUSDWhole(cur.k)}: 401(k) contribution, invested before income tax and
              still your money
            </li>
          )}
          <li>
            {cur.k > 0 ? 'Next' : 'First'}{' '}
            {formatUSDWhole(Math.min(Math.max(0, gross - cur.k), STD_DEDUCTION))}: standard
            deduction, no tax
          </li>
          {cur.fed.slices.map((s, i) => (
            <li key={i}>
              {pct(s.rate)} on {formatUSDWhole(s.amount)} &rarr; <strong>{formatUSDWhole(s.tax)}</strong>
            </li>
          ))}
          {cur.state && (
            <li>
              {cur.state.name} income tax, on its own schedule &rarr;{' '}
              <strong>{formatUSDWhole(cur.state.tax)}</strong>
            </li>
          )}
          {withPayroll && (
            <li>
              Social Security + Medicare, on (nearly) every dollar of wages &rarr;{' '}
              <strong>{formatUSDWhole(cur.payroll)}</strong>
            </li>
          )}
          <li className={styles.sliceTotal}>
            {withState || withPayroll
              ? `All taxes together: ${formatUSDWhole(cur.total)}`
              : `Federal income tax ${formatUSDWhole(cur.total)}; payroll and state taxes can be added above`}
          </li>
        </ul>
      </div>
      <Callout tone="mark" label="A raise cannot lower take-home pay">
        The $2,000 sits on top of the existing income, so it is taxed at the marginal rate and
        nothing more. The dollars below the threshold keep their old rates either way. Crossing
        into a higher bracket changes the tax on the new dollars only, and that stays true with
        every optional piece switched on.
      </Callout>
    </div>
  )
}

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
        The same {formatUSDWhole(earn)} of earnings goes into three accounts every year. The
        taxable account is taxed going in and on every year&rsquo;s returns. The traditional 401(k)
        is taxed once, at withdrawal. The Roth is taxed once, going in.
      </p>
      <div className={styles.controlsRow}>
        <Slider
          label="Contribution per year"
          value={earn}
          onChange={setEarn}
          min={500}
          max={15000}
          step={100}
          readout={`${formatUSDWhole(earn)}/yr`}
        />
        <Slider label="Years invested" value={years} onChange={setYears} min={5} max={45} step={1} readout={`${years} yrs`} />
        <Slider label="Annual return" value={ret} onChange={setRet} min={2} max={10} step={0.5} readout={`${ret}%`} />
        <Slider label="Tax rate today" value={taxNow} onChange={setTaxNow} min={0} max={50} step={1} readout={`${taxNow}%`} />
        <Slider label="Tax rate in retirement" value={taxLater} onChange={setTaxLater} min={0} max={50} step={1} readout={`${taxLater}%`} />
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
          caption={`After-tax value of ${formatUSDWhole(earn)} of earnings saved each year in each account. The taxable account's returns are taxed every year at the full rate, a simplification.`}
          ariaLabel="After-tax value of taxable, traditional, and Roth accounts over time"
          exportStats={[
            { label: 'Taxable', value: formatUSDWhole(last.taxable), color: SLATE },
            { label: 'Traditional', value: formatUSDWhole(last.traditional), color: GOLD },
            { label: 'Roth', value: formatUSDWhole(last.roth), color: RED },
          ]}
        />
      </div>
      <Callout tone="mark" label="Comparing the three accounts">
        With equal tax rates today and in retirement, the traditional and Roth accounts end at the
        same after-tax value. When the tax rate today is lower than the rate in retirement, the
        Roth ends higher; when the rate in retirement is lower, the traditional account ends
        higher. The taxable account ends below both because its returns are taxed every year,
        which lowers the rate at which the balance compounds.
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
    </div>
  )
}

/* ================= Part 3: Employer Matching ================= */

function EmployerMatching() {
  const [salary, setSalary] = useState(60000)
  const [contribPct, setContribPct] = useState(6)
  const [years, setYears] = useState(40)

  const rows = useMemo(() => matchScenarios(salary, contribPct / 100, years), [salary, contribPct, years])
  const last = rows[rows.length - 1]!
  const x = rows.map((r) => r.year)
  const yMax = last.fullMatch * 1.1

  const contrib = (contribPct / 100) * salary
  const matched = Math.min(contribPct / 100, MATCH_CAP) * salary
  const capped = contribPct / 100 > MATCH_CAP

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Contribute {pct(contribPct / 100)} of a {formatUSDWhole(salary)} salary and{' '}
        {formatUSDWhole(contrib)} goes into the 401(k). Under the most common formula the employer
        adds 50 cents for each of those dollars, another {formatUSDWhole(0.5 * matched)}, so the
        year starts with {formatUSDWhole(contrib + 0.5 * matched)} invested. The chart compares
        that against saving the same earnings with no match, and outside the 401(k) entirely.
      </p>
      <div className={styles.controlsRow}>
        <Slider label="Salary" value={salary} onChange={setSalary} min={25000} max={150000} step={1000} readout={formatUSDWhole(salary)} />
        <Slider
          label="Your contribution"
          value={contribPct}
          onChange={setContribPct}
          min={1}
          max={15}
          step={0.5}
          readout={`${contribPct}% (${formatUSDWhole(contrib)}/yr)`}
        />
        <Slider label="Years invested" value={years} onChange={setYears} min={10} max={45} step={1} readout={`${years} yrs`} />
      </div>
      {capped && (
        <p className={styles.note}>
          The match applies to the first {pct(MATCH_CAP)} of salary only, so the employer adds
          money on {formatUSDWhole(matched)} of your {formatUSDWhole(contrib)}. The dollars above
          the cap still get the tax shelter, just no bonus.
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
          figure="Figure 2."
          caption={`After-tax value of saving ${pct(contribPct / 100)} of a ${formatUSDWhole(salary)} salary each year at a ${pct(MATCH_RETURN)} return, with a ${pct(MATCH_TAX)} tax rate today and at withdrawal. The taxable account's returns are taxed every year; the 401(k) scenarios are taxed once, at withdrawal.`}
          ariaLabel="After-tax value of a taxable account and a 401(k) with no match, a 50% match, and a 100% match over time"
          exportStats={[
            { label: 'Taxable', value: formatUSDWhole(last.taxable), color: SLATE },
            { label: 'No match', value: formatUSDWhole(last.noMatch), color: GOLD },
            { label: '50% match', value: formatUSDWhole(last.halfMatch), color: RED },
            { label: '100% match', value: formatUSDWhole(last.fullMatch), color: GREEN },
          ]}
        />
      </div>
      <Callout tone="mark" label="The match multiplies the whole pile">
        Every matched dollar rides the same compounding as your own.{' '}
        {capped
          ? `Here the match covers the first ${pct(MATCH_CAP)} of salary, turning ${formatUSDWhole(last.noMatch)} into ${formatUSDWhole(last.halfMatch)} at 50 cents per dollar and ${formatUSDWhole(last.fullMatch)} at dollar for dollar.`
          : `With the whole contribution matched, 50 cents per dollar lifts the ending balance by exactly half, from ${formatUSDWhole(last.noMatch)} to ${formatUSDWhole(last.halfMatch)}, and dollar for dollar doubles it to ${formatUSDWhole(last.fullMatch)}.`}{' '}
        A match is the only guaranteed instant return in investing, which is why the standard
        advice is to contribute at least up to the match cap before saving anywhere else. Roughly
        1 in 4 employees with a match stops short of the full amount (Financial Engines, 2015).
      </Callout>
    </div>
  )
}

/* ================= Part 4: Retirement Timing ================= */

function RetirementTiming() {
  const [income, setIncome] = useState(80000)
  const [saveRate, setSaveRate] = useState(10)

  const curve = useMemo(() => retirementCurve(income), [income])
  const myYears = yearsToFree(income, saveRate / 100)
  const myAge = myYears === null ? null : START_AGE + myYears

  const x = curve.map((r) => r.rate)
  const ages = curve.map((r) => r.age)
  const yMax = Math.max(...ages) + 4

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Pick an income and a savings rate. The model finds the age when your savings can fund{' '}
        {RETIREMENT_YEARS} years of your current spending, starting work at {START_AGE}.
      </p>
      <div className={styles.controlsRow}>
        <Slider
          label="After-tax income"
          value={income}
          onChange={setIncome}
          min={40000}
          max={200000}
          step={5000}
          readout={formatUSDWhole(income)}
        />
        <Slider label="Savings rate" value={saveRate} onChange={setSaveRate} min={5} max={70} step={1} readout={`${saveRate}%`} />
      </div>
      <div className={styles.stats}>
        <Stat label="Saving per year" value={(income * saveRate) / 100} format={formatUSDWhole} animate={false} />
        <Stat label="Living on" value={income * (1 - saveRate / 100)} format={formatUSDWhole} animate={false} />
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
        The chart does not change when income moves: the date depends on the savings rate, not the
        paycheck.
      </p>
      <div>
        <div className={styles.legend}>
          <span style={{ color: GOLD }}>&#9632; retirement age by savings rate</span>
          <span style={{ color: RED }}>&#9476; your savings rate</span>
        </div>
        <StationChart
          x={x}
          yMin={START_AGE}
          yMax={yMax}
          ratio={CHART_RATIO}
          maxHeight={CHART_MAX_HEIGHT}
          xRef={saveRate}
          xRefLabel="you"
          lines={[{ ys: ages, color: GOLD, width: 3, label: 'Retirement age' }]}
          xTickFormat={(v) => `${Math.round(v)}%`}
          yTickFormat={(v) => `${Math.round(v)}`}
          xHoverLabel={(v) => `${Math.round(v)}% savings rate`}
          hoverValueFormat={(v) => `age ${Math.round(v)}`}
          figure="Figure 3."
          caption={`Savings grow at ${pct(R_SAVE)} while working and ${pct(R_RETIRED, 1)} in retirement; the target funds ${RETIREMENT_YEARS} years of current spending. The curve bends: early points of savings rate buy the most years.`}
          ariaLabel="Retirement age as a function of savings rate"
          exportStats={[
            { label: 'Savings rate', value: `${saveRate}%` },
            { label: 'Work optional at', value: myAge ? `age ${myAge}` : 'never', color: GREEN },
          ]}
        />
      </div>
      <Callout tone="mark" label="Why the curve bends">
        A higher savings rate works on both sides of the calculation: more goes into the account
        each year, and the spending the account must eventually replace gets smaller. That is why
        the first ten points of savings rate move the retirement age by more than the last ten.
      </Callout>
    </div>
  )
}

/* ============================== page ============================== */

const SECTIONS = [
  { id: 1, name: 'Take-Home Pay', C: TakeHomePay },
  { id: 2, name: 'Account Taxation', C: AccountTaxation },
  { id: 3, name: 'Employer Matching', C: EmployerMatching },
  { id: 4, name: 'Retirement Timing', C: RetirementTiming },
]

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function RetirementSimPage({ intro = true }: { intro?: boolean } = {}) {
  const [active, setActive] = useState(1)
  const S = SECTIONS.find((s) => s.id === active)!

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Tax efficiency, employer benefits &amp; retirement</p>
          <h1 className={styles.h1}>Retirement Planning Simulator</h1>
        </header>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Simulator sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === s.id}
            className={active === s.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActive(s.id)}
          >
            <div className={styles.tabKicker}>PART {s.id}</div>
            <div className={styles.tabName}>{s.name}</div>
          </button>
        ))}
      </div>

      <Card tone="raised">
        <S.C />
      </Card>

      <p className={styles.footnote}>
        Tax math: {TAX_YEAR} federal brackets and the {formatUSDWhole(STD_DEDUCTION)} standard
        deduction, single filer (IRS Rev. Proc. 2025-32); FICA with the{' '}
        {formatUSDWhole(SS_WAGE_BASE)} Social Security wage base; optional state income tax from
        the Tax Foundation&rsquo;s {TAX_YEAR} state tables. All four parts use simplified annual
        compounding for teaching; they are illustrations, not financial advice.
      </p>
    </div>
  )
}
