import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  SelectField,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole, texUSD } from '../../lib/format'
import {
  CONTRIBUTION_LIMITS,
  FICA,
  FILING_LABELS,
  STANDARD_DEDUCTION,
  TAX_YEAR,
  type FilingStatus,
} from './data2026'
import { STATE_OPTIONS } from './stateData2026'
import {
  computeIncomeTax,
  computePaycheck,
  computeRothVsTraditional,
  computeStateTax,
  type BracketSegment,
  type PaycheckResult,
} from './compute'
import { RateChart } from './components/RateChart'
import styles from './TaxPage.module.css'

type Surface = 'brackets' | 'paycheck' | 'rates' | 'roth' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'brackets', label: 'Your brackets' },
  { value: 'paycheck', label: 'Your paycheck' },
  { value: 'rates', label: 'Marginal vs. effective' },
  { value: 'roth', label: 'Roth vs. Traditional' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'
const VIOLET = 'var(--c-series-5)'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function TaxPage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('brackets')
  const [gross, setGross] = useState(80_000)
  const [status, setStatus] = useState<FilingStatus>('single')
  const [stateCode, setStateCode] = useState('CA')
  const [k401, setK401] = useState(5_000)

  const paycheck = useMemo(
    () => computePaycheck(gross, status, k401, stateCode),
    [gross, status, k401, stateCode]
  )

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Understanding taxes</p>
          <h1 className={styles.h1}>How your taxes work</h1>
          <p className={styles.lead}>
            Taxes are the biggest bill most households pay, and the system is simpler than it looks.
            Enter a salary and a state to see how the {TAX_YEAR} brackets fill, what the year&rsquo;s
            total comes to, and what your tax rates mean for decisions like a 401(k) or Roth
            contribution.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.controls}>
        <StepHeader title="Your situation" />
        <div className={styles.controlsGrid}>
          <NumberField label="Income (wages, $/yr)" value={gross} onChange={setGross} min={0} max={2_000_000} prefix="$" precision={0} />
          <SegmentedControl
            label="Filing status"
            options={[
              { value: 'single', label: 'Single' },
              { value: 'mfj', label: 'Married (joint)' },
            ]}
            value={status}
            onChange={setStatus}
          />
          <SelectField label="State" value={stateCode} onChange={setStateCode} options={STATE_OPTIONS} />
          <NumberField
            label="401(k) contribution ($/yr)"
            value={k401}
            onChange={setK401}
            min={0}
            max={CONTRIBUTION_LIMITS.k401}
            prefix="$"
            precision={0}
          />
        </div>
        <p className={styles.footnote}>
          Tax year {TAX_YEAR}, wage income only, federal standard deduction (
          {formatUSDWhole(STANDARD_DEDUCTION[status])} {FILING_LABELS[status].toLowerCase()}), plus{' '}
          {paycheck.state.name} state income tax
          {paycheck.state.hasTax
            ? paycheck.state.deduction > 0
              ? `, after its own ${formatUSDWhole(paycheck.state.deduction)} deduction`
              : ''
            : ', which taxes no wages'}
          . The 401(k) cap is the {TAX_YEAR} limit of {formatUSDWhole(CONTRIBUTION_LIMITS.k401)}.
          {paycheck.state.note ? ` ${paycheck.state.note}` : ''}
        </p>
      </Card>

      <Card tone="raised" className={styles.controls}>
        <StepHeader
          title="The bottom line"
          hint="These four numbers summarize the year. The tabs below show where each one comes from."
        />
        <div className={`${styles.stats} ${styles.bottomLineStats}`}>
          <Stat
            label="Total taxes this year"
            value={paycheck.totalTax}
            format={formatUSDWhole}
            emphasis
            accentColor={CARDINAL}
            note="federal + state + payroll"
          />
          <Stat
            label="Effective tax rate"
            value={paycheck.totalTaxRate}
            format={(v) => formatPercent(v, 1)}
            animate={false}
            note="total taxes ÷ gross income"
          />
          <Stat
            label="Marginal rate (next dollar)"
            value={paycheck.marginalAllInRate}
            format={(v) => formatPercent(v, 1)}
            animate={false}
            note="income tax plus payroll on your next dollar of wages"
          />
          <Stat
            label="Take-home pay"
            value={paycheck.takeHomeYear}
            format={formatUSDWhole}
            accentColor={GREEN}
            note="after all taxes and the 401(k)"
          />
        </div>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'brackets' && <BracketsView paycheck={paycheck} status={status} />}
          {surface === 'paycheck' && <PaycheckView paycheck={paycheck} status={status} />}
          {surface === 'rates' && <RatesView paycheck={paycheck} status={status} />}
          {surface === 'roth' && (
            <RothView
              marginalPct={Math.round((paycheck.incomeTax.marginalRate + paycheck.state.marginalRate) * 100)}
            />
          )}
          {surface === 'math' && <TaxMathView paycheck={paycheck} status={status} />}
        </Card>
        <Callout tone="plain" label="Educational model, not tax advice">
          This simplification skips credits, itemized deductions, local income taxes (city and
          county), capital gains rates, deduction phase-outs, and new {TAX_YEAR} provisions such as
          the senior deduction and the tips and overtime deductions. State figures come from the Tax
          Foundation&rsquo;s {TAX_YEAR} state tax tables. It shows the structure of the system, not
          a filing estimate.
        </Callout>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** One bracket schedule as "containers" that income fills bottom-up. */
function BracketContainers({ segments }: { segments: BracketSegment[] }) {
  return (
    <div className={styles.brackets}>
      {segments.map((seg) => {
        const span = Number.isFinite(seg.to) ? seg.to - seg.from : Math.max(seg.amount * 1.6, 1)
        const fillPct = Math.min(100, (seg.amount / span) * 100)
        return (
          <div key={`${seg.rate}-${seg.from}`} className={styles.bracketRow}>
            <span className={seg.isMarginal ? `${styles.bracketRate} ${styles.marginal}` : styles.bracketRate}>
              {+(seg.rate * 100).toFixed(2)}%
            </span>
            <div className={styles.bracketTrack}>
              <div
                className={seg.isMarginal ? `${styles.bracketFill} ${styles.marginal}` : styles.bracketFill}
                style={{ width: `${fillPct}%` }}
              />
              <span className={styles.bracketRange}>
                {formatUSDWhole(seg.from)} – {Number.isFinite(seg.to) ? formatUSDWhole(seg.to) : 'and up'}
              </span>
            </div>
            <span className={`${styles.bracketTax} tnum`}>
              {seg.amount > 0 ? <strong>{formatUSDWhole(seg.tax)}</strong> : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BracketsView({ paycheck, status }: { paycheck: PaycheckResult; status: FilingStatus }) {
  const { incomeTax, state } = paycheck
  // The $1,000-raise experiment, run exactly: federal and state together. The
  // raise lands on gross wages, so it runs through the same pipeline as the
  // real numbers — any unused standard deduction absorbs it first.
  const raise = useMemo(() => {
    const fedTaxable = Math.max(
      0,
      paycheck.gross + 1_000 - paycheck.contribution401k - paycheck.standardDeduction
    )
    const fed = computeIncomeTax(fedTaxable, status).tax - incomeTax.tax
    const st =
      computeStateTax(paycheck.gross + 1_000, paycheck.contribution401k, status, state.code).tax -
      state.tax
    return fed + st
  }, [incomeTax, status, paycheck.gross, paycheck.contribution401k, paycheck.standardDeduction, state])

  return (
    <>
      <StepHeader
        title="How the brackets apply to your income"
        hint="Each rate applies only to the dollars inside its own bracket. Moving into a higher bracket never changes the tax on the dollars below it. Your state uses the same idea with its own schedule, shown below the federal one."
      />
      <div className={styles.stats}>
        <Stat
          label="Income tax, federal + state"
          value={incomeTax.tax + state.tax}
          format={formatUSDWhole}
          emphasis
          accentColor={CARDINAL}
        />
        <Stat label="Federal income tax" value={incomeTax.tax} format={formatUSDWhole} />
        <Stat
          label={`${state.name} income tax`}
          value={state.tax}
          format={formatUSDWhole}
          accentColor={VIOLET}
          note={state.hasTax ? undefined : 'no state income tax on wages'}
        />
        <Stat
          label="Marginal income-tax rate"
          value={incomeTax.marginalRate + state.marginalRate}
          format={(v) => formatPercent(v, 1)}
          animate={false}
          note="federal plus state, on your next taxable dollar"
        />
      </div>

      <p className={styles.bracketGroupTitle}>
        Federal brackets · {FILING_LABELS[status]} · applied to taxable income, not gross wages
      </p>
      <p className={styles.derivation}>
        Taxable income = {formatUSDWhole(paycheck.gross)} wages − {formatUSDWhole(paycheck.contribution401k)}{' '}
        401(k) − {formatUSDWhole(paycheck.standardDeduction)} standard deduction ={' '}
        <strong>{formatUSDWhole(incomeTax.taxable)}</strong>
      </p>
      <BracketContainers segments={incomeTax.segments} />

      <p className={styles.bracketGroupTitle}>
        {state.name} brackets{state.hasTax ? ' · applied to state taxable income' : ''}
      </p>
      {state.hasTax ? (
        <>
          <p className={styles.derivation}>
            State taxable income = {formatUSDWhole(paycheck.gross)} wages −{' '}
            {formatUSDWhole(paycheck.contribution401k)} 401(k)
            {state.deduction > 0 ? ` − ${formatUSDWhole(state.deduction)} state deduction` : ''} ={' '}
            <strong>{formatUSDWhole(state.taxable)}</strong>
            {state.credit > 0 ? `, then a ${formatUSDWhole(state.credit)} exemption credit comes off the tax` : ''}
          </p>
          <BracketContainers segments={state.segments} />
        </>
      ) : (
        <p className={styles.derivation}>
          {state.name} levies no income tax on wages, so there is nothing to fill. Your state line
          is zero.
        </p>
      )}

      <Callout tone="note" label="A common misconception">
        &ldquo;A raise could put me in a higher bracket and lower my take-home pay.&rdquo; This is
        never true. If your income rose by <strong>$1,000</strong>, you would pay{' '}
        <strong>{formatUSDWhole(raise)}</strong> more in federal and state income tax and keep{' '}
        <strong>{formatUSDWhole(1_000 - raise)}</strong>. Only the dollars <em>above</em> a bracket
        line are taxed at the higher rate.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function PaycheckView({ paycheck: p, status }: { paycheck: PaycheckResult; status: FilingStatus }) {
  const noContrib = useMemo(
    () => computePaycheck(p.gross, status, 0, p.state.code),
    [p.gross, status, p.state.code]
  )
  const rows = [
    {
      label: '401(k) contribution',
      note: 'still your money, invested before income tax',
      value: p.contribution401k,
      color: GREEN,
    },
    {
      label: 'Federal income tax',
      note: `after the ${formatUSDWhole(p.standardDeduction)} standard deduction`,
      value: p.federalTax,
      color: CARDINAL,
    },
    {
      label: `${p.state.name} income tax`,
      note: p.state.hasTax
        ? `${formatPercent(p.state.marginalRate, 1)} marginal state rate`
        : 'no state income tax on wages',
      value: p.state.tax,
      color: VIOLET,
    },
    {
      label: 'Social Security (6.2%)',
      note: `on wages up to ${formatUSDWhole(FICA.ssWageBase)}`,
      value: p.socialSecurity,
      color: AMBER,
    },
    {
      label: p.additionalMedicare > 0 ? 'Medicare (1.45% + 0.9% surtax)' : 'Medicare (1.45%)',
      note: 'no wage cap',
      value: p.medicare + p.additionalMedicare,
      color: SLATE,
    },
  ]
  // Contributing $C lowers take-home by less than $C — the difference is the
  // income tax the contribution avoided this year.
  const takeHomeDrop = noContrib.takeHomeYear - p.takeHomeYear
  const taxSavedNow = p.contribution401k - takeHomeDrop

  return (
    <>
      <StepHeader
        title="Where each paycheck dollar goes"
        hint="A salary splits five ways before it reaches a bank account. One of the five, the 401(k) contribution, remains your money."
      />
      <div className={styles.stats}>
        <Stat label="Take-home per month" value={p.takeHomeMonth} format={formatUSDWhole} emphasis accentColor={GREEN} />
        <Stat
          label="Taxes per month"
          value={p.totalTax / 12}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note={`${formatPercent(p.totalTaxRate, 1)} of gross, all taxes included`}
        />
        <Stat label="Take-home per year" value={p.takeHomeYear} format={formatUSDWhole} />
      </div>

      <div className={styles.paycheck}>
        <div className={styles.payRow}>
          <span className={styles.payLabel}>
            <strong>Gross wages</strong>
          </span>
          <span />
          <span className={`${styles.payAmount} tnum`}>
            <strong>{formatUSDWhole(p.gross)}</strong>
          </span>
        </div>
        {rows.map((r) => (
          <div key={r.label} className={styles.payRow}>
            <span className={styles.payLabel}>
              {r.label}
              <span className={styles.payNote}>{r.note}</span>
            </span>
            <span className={styles.payBarTrack}>
              <span
                className={styles.payBar}
                style={{ width: `${p.gross > 0 ? (r.value / p.gross) * 100 : 0}%`, backgroundColor: r.color, display: 'block' }}
              />
            </span>
            <span className={`${styles.payAmount} tnum`}>−{formatUSDWhole(r.value)}</span>
          </div>
        ))}
        <div className={`${styles.payRow} ${styles.takeHomeRow}`}>
          <span className={styles.payLabel}>
            <strong>Take-home pay</strong>
          </span>
          <span />
          <span className={`${styles.payAmount} tnum`}>
            <strong>{formatUSDWhole(p.takeHomeYear)}</strong>
          </span>
        </div>
      </div>

      {p.contribution401k > 0 ? (
        <Callout tone="note" label="Pre-tax contributions">
          You put <strong>{formatUSDWhole(p.contribution401k)}</strong> into the 401(k), but take-home
          pay fell by only <strong>{formatUSDWhole(takeHomeDrop)}</strong> compared to not
          contributing. The contribution came out before income tax, which saved{' '}
          <strong>{formatUSDWhole(taxSavedNow)}</strong> in tax this year.
        </Callout>
      ) : (
        <Callout tone="note" label="Try a 401(k) contribution">
          Set a 401(k) contribution in the panel. Take-home pay falls by <em>less</em> than the
          contribution, because the money comes out before income tax. It is still subject to Social
          Security and Medicare.
        </Callout>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */

function RatesView({ paycheck: p, status }: { paycheck: PaycheckResult; status: FilingStatus }) {
  const keepOfNext100 = 100 * (1 - p.marginalAllInRate)
  return (
    <>
      <StepHeader
        title="Your two tax rates"
        hint="The effective rate describes the year as a whole: total tax divided by total income. The marginal rate applies only to the next dollar you earn. Most confusion about taxes comes from mixing the two up."
      />
      <div className={styles.stats}>
        <Stat
          label="Your effective tax rate"
          value={p.totalTaxRate}
          format={(v) => formatPercent(v, 1)}
          emphasis
          accentColor={GREEN}
          animate={false}
          note={`${formatUSDWhole(p.totalTax)} in taxes ÷ ${formatUSDWhole(p.gross)} gross income`}
        />
        <Stat
          label="Your marginal rate (next dollar)"
          value={p.marginalAllInRate}
          format={(v) => formatPercent(v, 1)}
          accentColor={CARDINAL}
          animate={false}
          note={`of the next $100 of wages, ${formatUSDWhole(keepOfNext100)} is yours`}
        />
      </div>

      <RateChart
        gross={p.gross}
        status={status}
        contribution401k={p.contribution401k}
        stateCode={p.state.code}
        stateName={p.state.name}
        exportStats={[
          { label: 'Gross income (wages)', value: formatUSDWhole(p.gross) },
          {
            label: p.contribution401k > 0 ? 'Taxable income (after 401(k) + deduction)' : 'Taxable income (after deduction)',
            value: formatUSDWhole(p.taxable),
          },
          { label: 'Total taxes (federal + state + payroll)', value: formatUSDWhole(p.totalTax) },
          { label: 'Effective rate (taxes ÷ gross)', value: formatPercent(p.totalTaxRate, 1), color: GREEN },
          { label: 'Marginal rate (next dollar of wages)', value: formatPercent(p.marginalAllInRate, 1), color: CARDINAL },
        ]}
        caption={`Both rates by gross income for a ${FILING_LABELS[status].toLowerCase()} filer in ${p.state.name}, all taxes included; the effective rate divides total tax by gross wages, before any deduction. Social Security (6.2%) and Medicare (1.45%) tax the first dollar of wages, so neither line starts at zero; the income tax joins in only once income clears any deduction. The marginal rate (red) climbs in steps as brackets fill and drops at the ${formatUSDWhole(FICA.ssWageBase)} Social Security cap. The effective rate (green) at your income is ${formatPercent(p.totalTaxRate, 1)}, well below your ${formatPercent(p.marginalAllInRate, 1)} marginal rate.`}
      />

      <Callout tone="note" label="Why the effective rate is always the lower one">
        Your income fills the cheap brackets first. The first{' '}
        {formatUSDWhole(p.standardDeduction)} of gross wages is covered by the standard deduction
        and taxed at zero, the next dollars at 10%, and so on up the schedule. The effective rate
        averages those early, lightly taxed dollars in with the later ones, so it always ends up
        below the rate on your last dollar. This is also why a raise cannot lower your take-home pay: new dollars are
        taxed at the margin and never change the tax on the dollars below them.
      </Callout>
      <Callout tone="mark" label="The dip in the red line">
        The marginal rate does not only go up. At <strong>{formatUSDWhole(FICA.ssWageBase)}</strong>{' '}
        wages stop owing the 6.2% Social Security tax, so the all-in marginal rate{' '}
        <strong>falls</strong> even though the income-tax brackets keep climbing. Above{' '}
        {formatUSDWhole(FICA.additionalMedicareThreshold[status])} the 0.9% Medicare surtax adds a
        little back.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function TaxMathView({ paycheck: p, status }: { paycheck: PaycheckResult; status: FilingStatus }) {
  const t = p.incomeTax
  const used = t.segments.filter((s) => s.amount > 0)
  // Two bracket terms per line so the sum never overflows the panel — a high
  // earner touches all seven brackets.
  const terms = used.map((s) => `${s.rate.toFixed(2)} \\times ${texUSD(s.amount)}`)
  const lines: string[] = []
  for (let i = 0; i < terms.length; i += 2) lines.push(terms.slice(i, i + 2).join(' + '))
  const bracketSum =
    terms.length === 0
      ? `\\text{income tax} = 0`
      : `\\begin{aligned} \\text{income tax} &= ${lines
          .map((l, i) => (i === 0 ? l : `\\quad + ${l}`))
          .join(' \\\\ &')} \\\\ &= \\boxed{${texUSD(t.tax)}} \\end{aligned}`

  return (
    <>
      <StepHeader
        title="Every number on this page, derived"
        hint="The same calculations the tool runs, written out with your inputs substituted in. Change the panel and the derivations update."
      />

      <FormulaBlock
        tex={`${texUSD(p.gross)} - ${texUSD(p.contribution401k)} - ${texUSD(p.standardDeduction)} = ${texUSD(t.taxable)}`}
        caption="Step 1. Taxable income equals wages minus the 401(k) contribution minus the standard deduction. Deductions come off the top, at your highest rate."
      />
      <FormulaBlock
        tex={bracketSum}
        caption="Step 2. Each rate multiplies only the income inside its own bracket, and the pieces are summed. This structure is why a raise cannot lower take-home pay."
        muted
      />
      <FormulaBlock
        tex={`\\text{average rate on taxable income} = \\frac{${texUSD(t.tax)}}{${texUSD(t.taxable)}} = ${formatPercent(t.effectiveRateOnTaxable, 1).replace('%', '\\%')} \\qquad \\text{marginal rate} = ${formatPercent(t.marginalRate, 0).replace('%', '\\%')}`}
        caption="Step 3. This average divides the federal income tax by taxable income; the effective rate in Step 9 divides the whole bill by gross wages instead, so the two are not the same number. The marginal rate is what the next dollar pays, and it is the rate to use when weighing extra income or a deduction."
        muted
      />
      <FormulaBlock
        tex={`\\text{Social Security} = 6.2\\% \\times \\min(${texUSD(p.gross)},\\; ${texUSD(FICA.ssWageBase)}) = ${texUSD(p.socialSecurity)}`}
        caption={`Step 4. Payroll tax applies to gross wages, including 401(k) contributions. Wages above the ${formatUSDWhole(FICA.ssWageBase)} cap owe no additional Social Security tax.`}
        muted
      />
      <FormulaBlock
        tex={`\\text{Medicare} = 1.45\\% \\times ${texUSD(p.gross)}${p.additionalMedicare > 0 ? ` + 0.9\\% \\times ${texUSD(p.gross - FICA.additionalMedicareThreshold[status])}` : ''} = ${texUSD(p.medicare + p.additionalMedicare)}`}
        caption={
          p.additionalMedicare > 0
            ? 'Step 5. Medicare has no wage cap, and wages above the threshold pay an additional 0.9%.'
            : `Step 5. Medicare has no wage cap. Above ${formatUSDWhole(FICA.additionalMedicareThreshold[status])}, an additional 0.9% would apply.`
        }
        muted
      />
      {p.state.hasTax ? (
        <FormulaBlock
          tex={`\\text{state taxable} = ${texUSD(p.gross)} - ${texUSD(p.contribution401k)}${p.state.deduction > 0 ? ` - ${texUSD(p.state.deduction)}` : ''} = ${texUSD(p.state.taxable)} \\;\\Rightarrow\\; \\text{${p.state.name.replace(/ /g, '\\ ')} tax} = ${texUSD(p.state.tax)}`}
          caption={`Step 6. ${p.state.name} starts from the same wages, ${p.state.deduction > 0 ? `subtracts its own ${formatUSDWhole(p.state.deduction)} deduction` : 'allows no deduction'}, and applies its own rate schedule${p.state.credit > 0 ? `, minus a ${formatUSDWhole(p.state.credit)} exemption credit` : ''}. Your marginal state rate is ${formatPercent(p.state.marginalRate, 1)}.`}
          muted
        />
      ) : (
        <FormulaBlock
          tex={`\\text{${p.state.name.replace(/ /g, '\\ ')} income tax} = ${texUSD(0)}`}
          caption={`Step 6. ${p.state.name} levies no income tax on wages, so the state line is zero.`}
          muted
        />
      )}
      <FormulaBlock
        tex={`\\begin{aligned} \\text{total tax} &= ${texUSD(p.federalTax)} + ${texUSD(p.state.tax)} + ${texUSD(p.socialSecurity)} + ${texUSD(p.medicare + p.additionalMedicare)} \\\\ &= \\boxed{${texUSD(p.totalTax)}} \\end{aligned}`}
        caption="Step 7. The whole year's bill in one number: federal income tax, state income tax, Social Security, and Medicare, added up."
      />
      <FormulaBlock
        tex={`\\text{take-home} = ${texUSD(p.gross)} - ${texUSD(p.contribution401k)} - ${texUSD(p.totalTax)} = \\boxed{${texUSD(p.takeHomeYear)}}`}
        caption="Step 8. Take-home pay equals wages minus the 401(k) contribution (which remains yours) minus the total tax bill."
      />
      <FormulaBlock
        tex={`\\text{effective rate} = \\frac{${texUSD(p.totalTax)}}{${texUSD(p.gross)}} = ${formatPercent(p.totalTaxRate, 1).replace('%', '\\%')} \\qquad \\text{marginal, all-in} = ${formatPercent(p.marginalAllInRate, 1).replace('%', '\\%')}`}
        caption="Step 9. The effective rate divides the whole bill by gross income and summarizes the year. The marginal rate is what the next dollar of wages pays once payroll tax is counted; use it when weighing extra income or a deduction."
        muted
      />

      <Callout tone="note" label="Match the rate to the decision">
        When you weigh a change, use the marginal rate, and match it to the change. An extra dollar
        of wages pays income tax and payroll tax:{' '}
        <strong>{formatPercent(p.marginalAllInRate, 1)}</strong> here. A deduction or a 401(k)
        contribution avoids only income tax:{' '}
        <strong>{formatPercent(t.marginalRate + p.state.marginalRate, 1)}</strong> here (
        {formatPercent(t.marginalRate, 0)} federal
        {p.state.hasTax ? ` plus ${formatPercent(p.state.marginalRate, 1)} state` : ', no state tax'}
        ). The Roth tab uses the income-tax rate for that reason: payroll tax is paid either way.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function RothView({ marginalPct }: { marginalPct: number }) {
  const [contribution, setContribution] = useState(6_000)
  const [years, setYears] = useState(30)
  const [returnPct, setReturnPct] = useState(7)
  const [taxNow, setTaxNow] = useState(marginalPct)
  const [taxRetire, setTaxRetire] = useState(12)

  const r = useMemo(
    () => computeRothVsTraditional(contribution, years, returnPct, taxNow, taxRetire),
    [contribution, years, returnPct, taxNow, taxRetire]
  )
  const winner = Math.abs(r.roth - r.traditional) < 0.5 ? 'tie' : r.roth > r.traditional ? 'roth' : 'traditional'

  return (
    <>
      <StepHeader
        title="Pay tax now, or pay tax later?"
        hint="The sacrifice from your paycheck is the same either way. A Traditional account taxes withdrawals in retirement; a Roth taxes the money before it goes in."
      />
      <div className={styles.rothControls}>
        <NumberField label="Set aside ($/yr, pre-tax)" value={contribution} onChange={setContribution} min={0} max={CONTRIBUTION_LIMITS.k401} prefix="$" precision={0} />
        <Slider label="For how long" value={years} onChange={setYears} min={5} max={45} step={1} readout={`${years} years`} />
        <NumberField label="Annual return" value={returnPct} onChange={setReturnPct} min={0} max={12} suffix="%" precision={1} />
        <div />
        <Slider label="Tax rate today" value={taxNow} onChange={setTaxNow} min={0} max={50} step={1} readout={`${taxNow}%`} note="Pre-filled with your federal plus state marginal income-tax rate. Payroll tax is paid either way, so it drops out of this comparison." />
        <Slider label="Tax rate in retirement" value={taxRetire} onChange={setTaxRetire} min={0} max={50} step={1} readout={`${taxRetire}%`} note="Most retirees drop to a lower bracket." />
      </div>

      <div className={styles.stats}>
        <Stat
          label="Traditional, after tax"
          value={r.traditional}
          format={formatUSDWhole}
          emphasis={winner === 'traditional'}
          accentColor={winner === 'traditional' ? GREEN : undefined}
          note={`${formatUSDWhole(r.traditionalPreTax)} balance, taxed ${taxRetire}% at withdrawal`}
        />
        <Stat
          label="Roth, after tax"
          value={r.roth}
          format={formatUSDWhole}
          emphasis={winner === 'roth'}
          accentColor={winner === 'roth' ? GREEN : undefined}
          note={`${formatUSDWhole(r.rothContribution)}/yr contributed after paying ${taxNow}% tax today`}
        />
      </div>

      <FormulaBlock
        tex={`\\underbrace{FV \\cdot (1 - t_{\\text{retirement}})}_{\\text{Traditional}} \\quad \\text{vs.} \\quad \\underbrace{FV \\cdot (1 - t_{\\text{now}})}_{\\text{Roth}}`}
        caption="The growth factor FV is identical on both sides, so only the two tax rates matter."
        muted
      />

      <Callout tone="note" label="The rule">
        {winner === 'tie' ? (
          <>
            At equal tax rates the two are <strong>exactly equivalent</strong>, because the order of
            multiplication does not matter. The choice matters only when the rates differ.
          </>
        ) : winner === 'traditional' ? (
          <>
            The rate in retirement ({taxRetire}%) is lower than the rate today ({taxNow}%), so{' '}
            <strong>Traditional comes out ahead by {formatUSDWhole(r.traditional - r.roth)}</strong>.
            The saver skips a high tax rate now and pays a lower one later.
          </>
        ) : (
          <>
            The rate today ({taxNow}%) is lower than the rate in retirement ({taxRetire}%), so{' '}
            <strong>Roth comes out ahead by {formatUSDWhole(r.roth - r.traditional)}</strong>. The
            saver pays a low tax rate now and never pays the higher one.
          </>
        )}{' '}
        Real plans add employer matches (a full match is worth taking in either account type),
        contribution limits, and required minimum distributions. The comparison above is the core
        logic.
      </Callout>
    </>
  )
}
