import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { paymentFromPV } from '../../lib/finance'
import { formatPercent, formatUSDWhole, texNumber, texUSD } from '../../lib/format'
import { FILING_LABELS, type FilingStatus } from '../Taxes/data2026'
import { COSTS, CREDIT_TIERS, HOUSING_YEAR, SALT, type CreditTier } from './data2026'
import {
  computeAffordability,
  computeHomeTaxes,
  computeMortgage,
  rateFor,
  type AffordabilityResult,
  type MortgageResult,
  type TermYears,
} from './compute'
import { AmortizationChart } from './components/AmortizationChart'
import { RateSensitivityChart } from './components/RateSensitivityChart'
import { TermInterestChart, TermLengthChart } from './components/TermLengthChart'
import styles from './HousingPage.module.css'

type Surface = 'payment' | 'afford' | 'rate' | 'term' | 'taxes' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'payment', label: 'The monthly payment' },
  { value: 'rate', label: 'Rate and credit' },
  { value: 'term', label: 'The length of the loan' },
  { value: 'afford', label: 'What can you afford?' },
  { value: 'taxes', label: 'Taxes and your home' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function HousingPage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('payment')
  const [price, setPrice] = useState(420_000)
  const [downPctInput, setDownPctInput] = useState(20)
  const [tier, setTier] = useState<CreditTier>('excellent')
  const [termKey, setTermKey] = useState<'30' | '15'>('30')
  // null = follow the credit tier and term; a number = a rate typed in (percent).
  const [ratePct, setRatePct] = useState<number | null>(null)
  const [taxPct, setTaxPct] = useState(Math.round(COSTS.propertyTaxRate * 10000) / 100)
  // null = proportional to the home's value; a number = a quote in dollars per year.
  const [insYr, setInsYr] = useState<number | null>(null)
  const [income, setIncome] = useState(100_000)
  const [debts, setDebts] = useState(500)

  const term: TermYears = termKey === '15' ? 15 : 30
  const downPct = downPctInput / 100
  const rate = ratePct != null ? ratePct / 100 : rateFor(tier, term)
  const costs = useMemo(
    () => ({ propertyTaxRate: taxPct / 100, insuranceYr: insYr ?? undefined }),
    [taxPct, insYr]
  )

  const m = useMemo(
    () => computeMortgage(price, downPct, rate, term, costs),
    [price, downPct, rate, term, costs]
  )
  const afford = useMemo(
    () => computeAffordability(income, debts, rate, term, downPct, costs),
    [income, debts, rate, term, downPct, costs]
  )
  const fits = m.piti <= afford.maxMonthly

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Buying a home</p>
          <h1 className={styles.h1}>What a house really costs</h1>
          <p className={styles.lead}>
            Set a price, a down payment, and a credit score to see the monthly payment, what a
            lender would approve, and what the loan means for your taxes.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.controls}>
        <StepHeader title="Your situation" />
        <div className={styles.controlsGrid}>
          <Slider
            label="Home price"
            value={price}
            onChange={setPrice}
            min={50_000}
            max={3_000_000}
            step={10_000}
            editable
            prefix="$"
          />
          <Slider
            label="Down payment"
            value={downPctInput}
            onChange={setDownPctInput}
            min={3}
            max={50}
            step={1}
            editable
            suffix="%"
            precision={1}
            note={`${formatUSDWhole(m.downPayment)} down.${m.hasPmi ? ' Below 20%, lenders add mortgage insurance (PMI).' : ''}`}
          />
          <SegmentedControl
            label="Credit score"
            options={CREDIT_TIERS.map((t) => ({ value: t.key, label: t.label }))}
            value={tier}
            onChange={(t) => {
              setTier(t)
              setRatePct(null)
            }}
          />
          <SegmentedControl
            label="Loan term"
            options={[
              { value: '30', label: '30-year' },
              { value: '15', label: '15-year' },
            ]}
            value={termKey}
            onChange={(k) => {
              setTermKey(k)
              setRatePct(null)
            }}
          />
          <Slider
            label="Interest rate (APR)"
            value={Math.round(rate * 10000) / 100}
            onChange={setRatePct}
            min={1}
            max={12}
            step={0.05}
            editable
            suffix="%"
            precision={2}
            note={ratePct == null ? 'Follows the credit score and term until you set it.' : undefined}
          />
          <Slider
            label="Property tax (% of value/yr)"
            value={taxPct}
            onChange={setTaxPct}
            min={0}
            max={3}
            step={0.05}
            editable
            suffix="%"
            precision={2}
          />
          <Slider
            label="Home insurance ($/yr)"
            value={Math.round(insYr ?? price * COSTS.insuranceRate)}
            onChange={setInsYr}
            min={0}
            max={15_000}
            step={100}
            editable
            prefix="$"
            note={insYr == null ? `0.5% of the home's value until you set a quote.` : undefined}
          />
          <Slider
            label="Household income ($/yr)"
            value={income}
            onChange={setIncome}
            min={0}
            max={2_000_000}
            step={5_000}
            editable
            prefix="$"
          />
          <Slider
            label="Other debt payments ($/mo)"
            value={debts}
            onChange={setDebts}
            min={0}
            max={20_000}
            step={100}
            editable
            prefix="$"
          />
        </div>
        <p className={styles.footnote}>
          Defaults are {HOUSING_YEAR} averages: 6.4% APR on a 30-year loan with excellent credit
          (Freddie Mac; good credit adds about 0.3 points, fair 1.1, a 15-year term subtracts
          0.6), property tax {formatPercent(COSTS.propertyTaxRate, 1)} and insurance{' '}
          {formatPercent(COSTS.insuranceRate, 1)} of value per year. All three can be set
          directly. PMI {formatPercent(COSTS.pmiRate, 1)} of the loan below 20% down.
        </p>
      </Card>

      <Card tone="raised" className={styles.controls}>
        <StepHeader
          title="The bottom line"
          hint="These four numbers summarize the purchase. The tabs below show where each one comes from."
        />
        <div className={`${styles.stats} ${styles.bottomLineStats}`}>
          <Stat
            label="All-in monthly cost"
            value={m.piti}
            format={formatUSDWhole}
            emphasis
            accentColor={CARDINAL}
            note="payment + property tax + insurance"
          />
          <Stat
            label="Most home you can afford"
            value={afford.maxPrice}
            format={formatUSDWhole}
            accentColor={GREEN}
            note="by the lender's 28/36 rule, at your income"
          />
          <Stat
            label="Total interest over the loan"
            value={m.totalInterest}
            format={formatUSDWhole}
            note={`on ${formatUSDWhole(m.loan)} borrowed for ${m.termYears} years`}
          />
          <Stat
            label="Housing share of income"
            value={income > 0 ? (m.piti * 12) / income : 0}
            format={(v) => formatPercent(v, 1)}
            animate={false}
            accentColor={fits ? GREEN : CARDINAL}
            note={fits ? 'within the 28% guideline' : 'above the 28% guideline'}
          />
        </div>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'payment' && <PaymentView m={m} />}
          {surface === 'afford' && <AffordView m={m} afford={afford} income={income} debts={debts} />}
          {surface === 'rate' && <RateView m={m} />}
          {surface === 'term' && <TermView m={m} />}
          {surface === 'taxes' && <HomeTaxView m={m} income={income} />}
          {surface === 'math' && <HousingMathView m={m} afford={afford} income={income} debts={debts} />}
        </Card>
        <Callout tone="plain" label="Educational model, not lending advice">
          Rates and ownership costs are fixed at {HOUSING_YEAR} averages; closing costs, HOA dues,
          maintenance, and local variation are skipped. It shows the structure of the decision, not
          a preapproval.
        </Callout>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PaymentView({ m }: { m: MortgageResult }) {
  const rows = [
    { label: 'Principal & interest', note: 'the loan payment itself, fixed for the whole term', value: m.pi, color: SLATE },
    { label: 'Property tax', note: `${formatPercent(COSTS.propertyTaxRate, 1)} of the home's value per year, held in escrow`, value: m.propertyTaxMonthly, color: AMBER },
    { label: 'Homeowners insurance', note: `${formatPercent(COSTS.insuranceRate, 1)} of the home's value per year`, value: m.insuranceMonthly, color: GREEN },
    ...(m.hasPmi
      ? [{ label: 'Mortgage insurance (PMI)', note: 'required until you reach 20% equity', value: m.pmiMonthly, color: CARDINAL }]
      : []),
  ]
  const maxRow = Math.max(...rows.map((r) => r.value))

  return (
    <>
      <StepHeader
        title="One price, four monthly bills"
        hint="The loan payment, plus the taxes and insurance that ride along with it."
      />
      <div className={styles.stats}>
        <Stat label="All-in monthly cost" value={m.piti} format={formatUSDWhole} emphasis accentColor={CARDINAL} />
        <Stat label="Loan amount" value={m.loan} format={formatUSDWhole} note={`after the ${formatUSDWhole(m.downPayment)} down payment`} />
        <Stat
          label="First payment: interest share"
          value={m.pi > 0 ? m.firstMonthInterest / m.pi : 0}
          format={(v) => formatPercent(v, 0)}
          animate={false}
          note={`${formatUSDWhole(m.firstMonthInterest)} of the first ${formatUSDWhole(m.pi)} payment is interest`}
        />
      </div>

      <div className={styles.costRows}>
        {rows.map((r) => (
          <div key={r.label} className={styles.costRow}>
            <span className={styles.costLabel}>
              {r.label}
              <span className={styles.costNote}>{r.note}</span>
            </span>
            <span className={styles.costBarTrack}>
              <span
                className={styles.costBar}
                style={{ width: `${maxRow > 0 ? (r.value / maxRow) * 100 : 0}%`, backgroundColor: r.color, display: 'block' }}
              />
            </span>
            <span className={`${styles.costAmount} tnum`}>{formatUSDWhole(r.value)}/mo</span>
          </div>
        ))}
      </div>

      <AmortizationChart
        years={m.years}
        termYears={m.termYears}
        crossoverYear={m.crossoverYear}
        caption={`Each year's payments split between interest (red) and principal (green).${
          m.crossoverYear ? ` Principal overtakes interest in year ${m.crossoverYear}.` : ''
        }`}
        exportStats={[
          { label: 'Monthly P&I', value: formatUSDWhole(m.pi), color: SLATE },
          { label: 'Total interest', value: formatUSDWhole(m.totalInterest), color: CARDINAL },
          { label: 'Loan', value: `${formatUSDWhole(m.loan)} · ${formatPercent(m.rate, 1)} · ${m.termYears}yr` },
        ]}
      />

      {m.hasPmi && (
        <Callout tone="mark" label="The cost of a small down payment">
          With {formatPercent(m.downPct, 0)} down, the lender adds private mortgage insurance:{' '}
          <strong>{formatUSDWhole(m.pmiMonthly)}</strong> a month. It protects the lender and lasts
          until equity reaches 20%.
        </Callout>
      )}
      <Callout tone="note" label="Why the first years feel slow">
        Interest is charged on the remaining balance. Of the first {formatUSDWhole(m.pi)} payment,{' '}
        <strong>{formatUSDWhole(m.firstMonthInterest)}</strong> is interest and{' '}
        <strong>{formatUSDWhole(m.firstMonthPrincipal)}</strong> pays down the loan; the split
        shifts toward principal each month.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function AffordView({
  m,
  afford,
  income,
  debts,
}: {
  m: MortgageResult
  afford: AffordabilityResult
  income: number
  debts: number
}) {
  const monthlyIncome = income / 12
  const fits = m.piti <= afford.maxMonthly
  return (
    <>
      <StepHeader
        title="The 28/36 rule, run on your numbers"
        hint="Two ceilings: housing under 28% of gross monthly income, housing plus all other debt under 36%. The lower one wins."
      />
      <div className={styles.stats}>
        <Stat
          label="Housing ceiling (28%)"
          value={afford.maxHousingMonthly}
          format={formatUSDWhole}
          note={`28% of ${formatUSDWhole(monthlyIncome)} gross monthly income`}
          accentColor={afford.binding === 'housing' ? CARDINAL : undefined}
        />
        <Stat
          label="Total-debt ceiling (36%)"
          value={afford.totalCeilingMonthly}
          format={formatUSDWhole}
          note="housing plus every other debt payment; fixed by income"
        />
        <Stat
          label="Left for housing under 36%"
          value={afford.maxTotalMonthly}
          format={formatUSDWhole}
          note={`the ${formatUSDWhole(afford.totalCeilingMonthly)} ceiling minus ${formatUSDWhole(debts)} of other debts`}
          accentColor={afford.binding === 'debts' ? CARDINAL : undefined}
        />
        <Stat
          label="Most home you can afford"
          value={afford.maxPrice}
          format={formatUSDWhole}
          emphasis
          accentColor={GREEN}
          note={`a ${formatUSDWhole(afford.maxMonthly)}/mo budget, priced at your loan terms`}
        />
      </div>

      <p className={styles.derivation}>
        The binding limit is{' '}
        <strong>
          {afford.binding === 'housing'
            ? 'the 28% housing ceiling'
            : 'what the 36% ceiling leaves after other debts'}
        </strong>
        . Each $100,000 of home price costs about {formatUSDWhole(afford.costPerDollar * 100_000)}{' '}
        per month at these terms, so the {formatUSDWhole(afford.maxMonthly)} budget supports a{' '}
        {formatUSDWhole(afford.maxPrice)} home.
      </p>

      <Callout tone={fits ? 'note' : 'mark'} label={fits ? 'This home fits the guideline' : 'This home breaks the guideline'}>
        {fits ? (
          <>
            At <strong>{formatUSDWhole(m.piti)}</strong> per month, this home is under the{' '}
            <strong>{formatUSDWhole(afford.maxMonthly)}</strong> ceiling: affordable by the 28/36
            rule.
          </>
        ) : (
          <>
            At <strong>{formatUSDWhole(m.piti)}</strong> per month, this home is over the{' '}
            <strong>{formatUSDWhole(afford.maxMonthly)}</strong> ceiling: a lender would push back.
          </>
        )}
      </Callout>
      <Callout tone="note" label="Other debts shrink the house">
        The 36% ceiling counts car loans, student loans, and card minimums against the same budget
        as the mortgage. Clearing a $350 car payment can raise the approved price by tens of
        thousands of dollars.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function RateView({ m }: { m: MortgageResult }) {
  const fair = computeMortgage(m.price, m.downPct, rateFor('fair', m.termYears), m.termYears)
  const excellent = computeMortgage(m.price, m.downPct, rateFor('excellent', m.termYears), m.termYears)

  return (
    <>
      <StepHeader
        title="The same house, priced by your credit score"
        hint="The rate follows the credit score, and the rate sets what the bank collects over the years."
      />
      <div className={styles.stats}>
        <Stat
          label="Excellent credit (760+)"
          value={excellent.pi}
          format={formatUSDWhole}
          accentColor={GREEN}
          note={`${formatPercent(excellent.rate, 1)} APR, P&I per month`}
        />
        <Stat
          label="Fair credit (~640)"
          value={fair.pi}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note={`${formatPercent(fair.rate, 1)} APR, P&I per month`}
        />
        <Stat
          label="What the score is worth"
          value={(fair.pi - excellent.pi) * 12 * m.termYears}
          format={formatUSDWhole}
          emphasis
          note={`${formatUSDWhole(fair.pi - excellent.pi)}/mo, over the full ${m.termYears} years`}
        />
      </div>

      <RateSensitivityChart
        loan={m.loan}
        termYears={m.termYears}
        caption={`Principal and interest across rates, with the three credit tiers marked. One point changes the payment by about ${formatUSDWhole(Math.abs(computeMortgage(m.price, m.downPct, m.rate + 0.01, m.termYears).pi - m.pi))} a month.`}
        exportStats={[
          { label: 'Excellent (760+)', value: `${formatUSDWhole(excellent.pi)}/mo`, color: GREEN },
          { label: 'Fair (~640)', value: `${formatUSDWhole(fair.pi)}/mo`, color: CARDINAL },
          { label: 'Loan', value: `${formatUSDWhole(m.loan)} · ${m.termYears}yr` },
        ]}
      />

    </>
  )
}

/* ------------------------------------------------------------------ */

function TermView({ m }: { m: MortgageResult }) {
  const [termYears, setTermYears] = useState(30)
  const loanRate = m.rate
  const i = loanRate / 12
  const pay = (years: number) => (m.loan > 0 ? paymentFromPV(m.loan, i, years * 12) : 0)
  const interestFor = (years: number) => pay(years) * years * 12 - m.loan
  const ioMonthly = m.loan * i

  return (
    <>
      <StepHeader
        title="How long you borrow"
        hint="A longer term lowers the payment and raises the total interest. Both effects have a limit."
      />
      <Slider
        label="Loan term"
        value={termYears}
        onChange={setTermYears}
        min={10}
        max={100}
        step={1}
        editable
        suffix="years"
      />
      <div className={styles.stats}>
        <Stat
          label={`Payment, ${termYears}-year loan`}
          value={pay(termYears)}
          format={formatUSDWhole}
          emphasis
          note={`${formatUSDWhole(pay(termYears) - ioMonthly)} above the interest-only floor`}
        />
        <Stat
          label={`Total interest, ${termYears}-year loan`}
          value={interestFor(termYears)}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note={
            interestFor(termYears) > m.loan
              ? `${(interestFor(termYears) / m.loan).toFixed(1)}× the amount borrowed`
              : `on the ${formatUSDWhole(m.loan)} loan`
          }
        />
        <Stat
          label="30-year payment"
          value={pay(30)}
          format={formatUSDWhole}
          accentColor={SLATE}
          note={`${formatUSDWhole(interestFor(30))} total interest`}
        />
        <Stat
          label="Interest-only payment"
          value={ioMonthly}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note="the balance never falls, so the interest never ends"
        />
      </div>

      <TermLengthChart
        loan={m.loan}
        rate={loanRate}
        highlightYears={termYears}
        caption={`Monthly payment by loan length at ${formatPercent(loanRate, 1)} APR (real rates vary a little by term). Past 30 years the curve hugs the interest-only floor: more length buys almost nothing.`}
        exportStats={[
          { label: `${termYears}-year`, value: `${formatUSDWhole(pay(termYears))}/mo`, color: SLATE },
          { label: '30-year', value: `${formatUSDWhole(pay(30))}/mo`, color: SLATE },
          { label: 'Interest-only', value: `${formatUSDWhole(ioMonthly)}/mo`, color: CARDINAL },
        ]}
      />

      <TermInterestChart
        loan={m.loan}
        rate={loanRate}
        highlightYears={termYears}
        caption={`Total interest never levels off: ${formatUSDWhole(interestFor(50))} by year 50, ${formatUSDWhole(interestFor(100))} by year 100. The interest-only loan is off this chart entirely: no end to the loan, no end to the interest.`}
        exportStats={[
          { label: `${termYears}-year`, value: formatUSDWhole(interestFor(termYears)), color: CARDINAL },
          { label: '30-year', value: formatUSDWhole(interestFor(30)), color: SLATE },
          { label: 'The loan itself', value: formatUSDWhole(m.loan) },
        ]}
      />

      <Callout tone="mark" label="The 50-year mortgage, priced">
        A 50-year mortgage, floated as an affordability fix, cuts the payment{' '}
        <strong>{formatUSDWhole(pay(30) - pay(50))}</strong> below the 30-year and adds{' '}
        <strong>{formatUSDWhole(interestFor(50) - interestFor(30))}</strong> of interest. The limit
        of the idea is the interest-only loan: {formatUSDWhole(ioMonthly)} a month, forever,
        retiring nothing.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function HomeTaxView({ m, income }: { m: MortgageResult; income: number }) {
  const [status, setStatus] = useState<FilingStatus>('mfj')
  const ht = useMemo(() => computeHomeTaxes(income, status, m), [income, status, m])

  return (
    <>
      <StepHeader
        title="Does buying change your taxes?"
        hint="Interest and property tax are deductible only if you itemize, and itemizing only pays past the standard deduction."
      />
      <div className={styles.localControls}>
        <SegmentedControl
          label="Filing status"
          options={[
            { value: 'single', label: 'Single' },
            { value: 'mfj', label: 'Married (joint)' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>

      <div className={styles.stats}>
        <Stat
          label="The home's deductions, year 1"
          value={ht.itemized}
          format={formatUSDWhole}
          note={`${formatUSDWhole(ht.deductibleInterest)} interest + ${formatUSDWhole(ht.saltAllowed)} property tax`}
          accentColor={ht.itemizes ? GREEN : undefined}
        />
        <Stat
          label="Standard deduction"
          value={ht.standard}
          format={formatUSDWhole}
          note={`${FILING_LABELS[status].toLowerCase()}, no receipts required`}
          accentColor={ht.itemizes ? undefined : GREEN}
        />
        <Stat
          label="Tax saved by owning, year 1"
          value={Math.max(0, ht.saved)}
          format={formatUSDWhole}
          emphasis
          accentColor={ht.saved > 0 ? GREEN : undefined}
          note={ht.itemizes ? 'the amount itemizing beats the standard deduction, taxed at the margin' : 'the standard deduction still wins, so owning saves nothing'}
        />
      </div>

      <p className={styles.derivation}>
        Year-one interest on the {formatUSDWhole(m.loan)} loan is{' '}
        <strong>{formatUSDWhole(ht.interestYear1)}</strong>
        {ht.deductibleInterest < ht.interestYear1
          ? `, of which ${formatUSDWhole(ht.deductibleInterest)} is deductible (interest counts only on the first ${formatUSDWhole(750_000)} of the loan)`
          : ''}
        . Property tax is <strong>{formatUSDWhole(ht.propertyTaxYear)}</strong>, within the{' '}
        {formatUSDWhole(ht.saltCap)} state-and-local-tax cap. Together they{' '}
        {ht.itemizes ? (
          <>
            beat the {formatUSDWhole(ht.standard)} standard deduction, so itemizing cuts federal
            income tax from {formatUSDWhole(ht.taxStandard)} to{' '}
            <strong>{formatUSDWhole(ht.taxItemized)}</strong>.
          </>
        ) : (
          <>
            fall short of the {formatUSDWhole(ht.standard)} standard deduction: the home changes
            nothing on the return.
          </>
        )}
      </p>

      <Callout tone="note" label="The folk wisdom is out of date">
        &ldquo;Buy a house for the tax break&rdquo; dates from a smaller standard deduction. A
        married couple now starts with {formatUSDWhole(ht.standard)} for free, so a typical
        loan&rsquo;s interest often does not clear the bar. State income taxes share the same{' '}
        {formatUSDWhole(ht.saltCap)} cap; this page counts only property tax.
      </Callout>
      <Callout tone="note" label="The tax breaks that matter more">
        Living in the home is untaxed income, and up to{' '}
        {formatUSDWhole(status === 'mfj' ? 500_000 : 250_000)} of gain on a primary residence is
        tax-free. Neither requires itemizing.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function HousingMathView({
  m,
  afford,
  income,
  debts,
}: {
  m: MortgageResult
  afford: AffordabilityResult
  income: number
  debts: number
}) {
  const i = m.rate / 12
  const n = m.termYears * 12
  return (
    <>
      <StepHeader
        title="Every number on this page, derived"
        hint="The tool&rsquo;s calculations, written out with your inputs substituted in."
      />
      <FormulaBlock
        tex={`${texUSD(m.price)} - \\underbrace{${texUSD(m.downPayment)}}_{${formatPercent(m.downPct, 0).replace('%', '\\%')}\\text{ down}} = ${texUSD(m.loan)}\\text{ borrowed}`}
        caption="Step 1. The down payment comes out of savings; the rest is the loan."
      />
      <FormulaBlock
        tex={`M = L \\cdot \\frac{i}{1-(1+i)^{-n}} = ${texUSD(m.loan)} \\cdot \\frac{${texNumber(i, 5)}}{1-(1+${texNumber(i, 5)})^{-${n}}} = \\boxed{${texUSD(m.pi)}}`}
        caption={`Step 2. The fixed monthly payment on ${formatUSDWhole(m.loan)} at ${formatPercent(m.rate, 1)} APR (i is the monthly rate, n the ${n} monthly payments). This is the same annuity formula as the TVM calculator.`}
        muted
      />
      <FormulaBlock
        tex={`${texUSD(m.pi)} + \\underbrace{${texUSD(m.propertyTaxMonthly)}}_{\\text{property tax}} + \\underbrace{${texUSD(m.insuranceMonthly)}}_{\\text{insurance}}${m.hasPmi ? ` + \\underbrace{${texUSD(m.pmiMonthly)}}_{\\text{PMI}}` : ''} = \\boxed{${texUSD(m.piti)}}`}
        caption="Step 3. The all-in monthly cost adds the escrow items to the loan payment. Lenders call this PITI: principal, interest, taxes, insurance."
        muted
      />
      <FormulaBlock
        tex={`${texNumber(n)} \\times ${texUSD(m.pi)} - ${texUSD(m.loan)} = \\boxed{${texUSD(m.totalInterest)}}\\text{ of interest}`}
        caption="Step 4. Total payments minus the amount borrowed is the cost of the borrowing itself."
        muted
      />
      <FormulaBlock
        tex={`\\min\\Big(\\underbrace{0.28 \\times ${texUSD(income / 12)}}_{\\text{housing}},\\; \\underbrace{0.36 \\times ${texUSD(income / 12)} - ${texUSD(debts)}}_{\\text{after other debts}}\\Big) = ${texUSD(afford.maxMonthly)}`}
        caption={`Step 5. The 28/36 rule: both ceilings are computed on ${formatUSDWhole(income / 12)} of gross monthly income and the smaller one binds.`}
        muted
      />
      <FormulaBlock
        tex={`\\text{max price} = \\frac{${texUSD(afford.maxMonthly)}}{${texNumber(afford.costPerDollar, 5)}\\text{ per \\$1 of price}} = \\boxed{${texUSD(afford.maxPrice)}}`}
        caption="Step 6. Every monthly cost (payment, taxes, insurance, PMI) scales with the price, so the budget divided by the cost of each price dollar gives the most affordable home."
        muted
      />
      <FormulaBlock
        tex={`\\underbrace{${texUSD(m.piti)}}_{\\text{this home}} ${m.piti <= afford.maxMonthly ? '\\le' : '>'} ${texUSD(afford.maxMonthly)}`}
        caption={`Step 7. The verdict: this home's all-in cost ${m.piti <= afford.maxMonthly ? 'fits inside' : 'exceeds'} the lender's ceiling.`}
        muted
      />
      <Callout tone="note" label="Where the tax numbers come from">
        The taxes tab reuses the Understanding Taxes lesson&rsquo;s bracket engine: it computes
        federal income tax twice, once with the standard deduction and once with the home&rsquo;s
        itemized deductions, and reports the difference. The {HOUSING_YEAR} SALT cap is{' '}
        {formatUSDWhole(SALT.cap)} (falling to {formatUSDWhole(SALT.floor)} for incomes above{' '}
        {formatUSDWhole(SALT.phaseOutStart)}), and interest counts on the first{' '}
        {formatUSDWhole(750_000)} of the loan.
      </Callout>
    </>
  )
}
