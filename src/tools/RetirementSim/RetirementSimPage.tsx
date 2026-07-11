import { useMemo, useState } from 'react'
import { Button, Callout, Card, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared with Chance & Ownership: same lesson family, same chart canvas.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import {
  CONTRIBUTION_LIMITS,
  FORMULAS,
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
  matchOutcome,
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
  const gross = raiseOn ? salary + 2000 : salary

  const cur = useMemo(() => federalTax(gross), [gross])
  const base = useMemo(() => federalTax(salary), [salary])
  const ficaCur = fica(gross)
  const takeHome = gross - cur.tax - ficaCur
  const takeHomeBase = salary - base.tax - fica(salary)
  const raiseDelta = takeHome - takeHomeBase

  const segments = useMemo(() => {
    const raw = [
      { name: 'standard deduction', total: Math.min(gross, STD_DEDUCTION), taken: 0, rate: 0 },
      ...cur.slices.map((s) => ({ name: `${pct(s.rate)} bracket`, total: s.amount, taken: s.tax, rate: s.rate })),
    ]
    let acc = 0
    return raw.map((g) => {
      const w = (g.total / gross) * 100
      const seg = { ...g, w, center: acc + w / 2 }
      acc += w
      return seg
    })
  }, [gross, cur])
  const tip = hover != null ? segments[hover] : null

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Move the salary and watch each dollar go through the brackets in order. The first{' '}
        {formatUSDWhole(STD_DEDUCTION)} passes untaxed (the standard deduction), and each bracket
        taxes only the dollars inside it.
      </p>
      <div className={styles.controlsRow}>
        <Slider
          label="Gross salary"
          value={salary}
          onChange={setSalary}
          min={20000}
          max={250000}
          step={1000}
          readout={formatUSDWhole(salary)}
        />
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
      <div className={styles.stats}>
        <Stat label="Take-home" value={takeHome} format={formatUSDWhole} emphasis animate={false} />
        <Stat label="Marginal rate" value={cur.marginal} format={(v) => pct(v)} accentColor={RED} animate={false} />
        <Stat label="Effective rate" value={cur.tax / gross} format={(v) => pct(v, 1)} animate={false} />
      </div>

      <div>
        <div className={styles.legend}>
          <span style={{ color: GOLD }}>&#9632; kept</span>
          <span style={{ color: RED }}>&#9632; federal income tax</span>
        </div>
        <div className={styles.bracketWrap}>
          <div className={styles.bracketBar} onMouseLeave={() => setHover(null)}>
            {segments.map((g, i) => {
              const takenShare = g.total > 0 ? g.taken / g.total : 0
              return (
                <div
                  key={i}
                  className={styles.bracketSeg}
                  style={{ width: `${g.w}%` }}
                  onMouseEnter={() => setHover(i)}
                >
                  <div className={styles.bracketTax} style={{ height: `${takenShare * 100}%` }} />
                  {g.w > 7 && <div className={styles.bracketRate}>{pct(g.rate)}</div>}
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
                <span>Kept</span>
                <strong className="tnum">{formatUSDWhole(tip.total - tip.taken)}</strong>
              </div>
            </div>
          )}
        </div>
        <ul className={styles.sliceList}>
          <li>First {formatUSDWhole(Math.min(gross, STD_DEDUCTION))}: standard deduction, no tax</li>
          {cur.slices.map((s, i) => (
            <li key={i}>
              {pct(s.rate)} on {formatUSDWhole(s.amount)} &rarr; <strong>{formatUSDWhole(s.tax)}</strong>
            </li>
          ))}
          <li className={styles.sliceTotal}>
            Federal income tax {formatUSDWhole(cur.tax)}, plus FICA {formatUSDWhole(ficaCur)} charged
            separately on (nearly) every dollar
          </li>
        </ul>
      </div>
      <Callout tone="mark" label="A raise cannot lower take-home pay">
        The $2,000 sits on top of the existing income, so it is taxed at the marginal rate plus
        payroll tax and nothing more. The dollars below the threshold keep their old rates either
        way. Crossing into a higher bracket changes the tax on the new dollars only.
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
      <p className={styles.note}>
        Contributions are capped by law. For {TAX_YEAR}, the IRA limit (traditional and Roth
        combined) is {formatUSDWhole(CONTRIBUTION_LIMITS.ira)} and the 401(k) employee limit is{' '}
        {formatUSDWhole(CONTRIBUTION_LIMITS.k401)}; both allow additional catch-up contributions
        from age 50.
      </p>
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
    </div>
  )
}

/* ================= Part 3: Employer Matching ================= */

function EmployerMatching() {
  const [salary, setSalary] = useState(50000)
  const [contribPct, setContribPct] = useState(3)
  const [formulaId, setFormulaId] = useState('50on6')
  const [years, setYears] = useState(40)
  const f = FORMULAS.find((x) => x.id === formulaId)!

  const m = useMemo(() => matchOutcome(salary, contribPct / 100, f, years), [salary, contribPct, f, years])
  const maxBar = Math.max(m.matched + m.forgone, 1)

  return (
    <div className={styles.section}>
      <p className={styles.sectionLede}>
        Pick a match formula and a contribution rate. The employer&rsquo;s money arrives only on
        the dollars you contribute inside the formula&rsquo;s cap.
      </p>
      <div className={styles.controlsRow}>
        <Slider label="Salary" value={salary} onChange={setSalary} min={25000} max={150000} step={1000} readout={formatUSDWhole(salary)} />
        <Slider
          label="Your contribution"
          value={contribPct}
          onChange={setContribPct}
          min={0}
          max={15}
          step={0.5}
          readout={`${contribPct}% (${formatUSDWhole(m.contrib)}/yr)`}
        />
        <Slider label="Career length" value={years} onChange={setYears} min={10} max={45} step={1} readout={`${years} yrs`} />
        <div className={styles.radioGroup} role="radiogroup" aria-label="Employer formula">
          <span className={styles.radioTitle}>Employer formula</span>
          {FORMULAS.map((x) => (
            <label key={x.id} className={styles.radioLabel}>
              <input type="radio" name="formula" checked={formulaId === x.id} onChange={() => setFormulaId(x.id)} />
              {x.label}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.matchBars}>
        {[
          { label: 'Match claimed', v: m.matched, color: GOLD },
          { label: 'Match missed', v: m.forgone, color: RED },
        ].map((b) => (
          <div key={b.label} className={styles.matchBarRow}>
            <span className={styles.matchBarLabel}>{b.label}</span>
            <div className={styles.matchBarTrack}>
              <div className={styles.matchBarFill} style={{ width: `${(b.v / maxBar) * 100}%`, background: b.color }} />
            </div>
            <span className={`${styles.matchBarValue} tnum`} style={{ color: b.color }}>
              {formatUSDWhole(b.v)}/yr
            </span>
          </div>
        ))}
      </div>
      <div className={styles.stats}>
        <Stat
          label="Match received per year"
          value={m.matched}
          format={formatUSDWhole}
          accentColor={m.forgone > 0 ? undefined : GREEN}
          animate={false}
        />
        <Stat label={`Employer money after ${years} yrs at 7%`} value={m.careerMatch} format={formatUSDWhole} emphasis animate={false} />
        {m.forgone > 0 && (
          <Stat label="Career cost of the missed match" value={m.careerForgone} format={formatUSDWhole} accentColor={RED} animate={false} />
        )}
      </div>
      <p className={styles.note}>
        {m.forgone > 0
          ? `You are collecting ${formatUSDWhole(m.matched)} of the ${formatUSDWhole(m.maxMatch)} available each year. About 1 in 4 employees with a match stops short of the full amount (Financial Engines, 2015).`
          : 'Full match captured.'}
      </p>
      <Callout tone="mark" label="The formula sets the break-even contribution">
        Each formula has a contribution rate at which the full match is captured: 6% under the
        common formula, 3% under the dollar-for-dollar version. Contributing below that rate leaves
        part of the offered compensation unclaimed, and the career-cost figure shows what those
        unclaimed dollars would have compounded to at 7%. Contributions above the cap still get the
        tax shelter, just no bonus.
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
          figure="Figure 2."
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

export function RetirementSimPage() {
  const [active, setActive] = useState(1)
  const S = SECTIONS.find((s) => s.id === active)!

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Tax efficiency, employer benefits &amp; retirement</p>
        <h1 className={styles.h1}>Retirement Planning Simulator</h1>
      </header>

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
        {formatUSDWhole(SS_WAGE_BASE)} Social Security wage base. All four parts use simplified
        annual compounding for teaching; they are illustrations, not financial advice.
      </p>
    </div>
  )
}
