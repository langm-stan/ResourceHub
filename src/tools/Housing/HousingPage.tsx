import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
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
import styles from './HousingPage.module.css'

type Surface = 'payment' | 'afford' | 'rate' | 'taxes' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'payment', label: 'The monthly payment' },
  { value: 'afford', label: 'What can you afford?' },
  { value: 'rate', label: 'Rate, credit, and term' },
  { value: 'taxes', label: 'Taxes and your home' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'

export function HousingPage() {
  const [surface, setSurface] = useState<Surface>('payment')
  const [price, setPrice] = useState(420_000)
  const [downPctInput, setDownPctInput] = useState(20)
  const [tier, setTier] = useState<CreditTier>('excellent')
  const [termKey, setTermKey] = useState<'30' | '15'>('30')
  const [income, setIncome] = useState(100_000)
  const [debts, setDebts] = useState(500)

  const term: TermYears = termKey === '15' ? 15 : 30
  const downPct = downPctInput / 100
  const rate = rateFor(tier, term)

  const m = useMemo(() => computeMortgage(price, downPct, rate, term), [price, downPct, rate, term])
  const afford = useMemo(
    () => computeAffordability(income, debts, rate, term, downPct),
    [income, debts, rate, term, downPct]
  )
  const fits = m.piti <= afford.maxMonthly

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Buying a home</p>
        <h1 className={styles.h1}>What a house really costs</h1>
        <p className={styles.lead}>
          A home is the largest purchase most households ever make, and almost all of it is
          borrowed. Set a price, a down payment, and a credit score to see the monthly payment, the
          most home a lender says you can afford, and what the loan means for your taxes.
        </p>
      </header>

      <Card tone="raised" className={styles.controls}>
        <StepHeader title="Your situation" />
        <div className={styles.controlsGrid}>
          <NumberField label="Home price" value={price} onChange={setPrice} min={50_000} max={3_000_000} prefix="$" precision={0} />
          <Slider
            label="Down payment"
            value={downPctInput}
            onChange={setDownPctInput}
            min={3}
            max={50}
            step={1}
            readout={`${downPctInput}% · ${formatUSDWhole(m.downPayment)}`}
            note={m.hasPmi ? 'Below 20% down, lenders add mortgage insurance (PMI).' : undefined}
          />
          <SegmentedControl
            label="Credit score"
            options={CREDIT_TIERS.map((t) => ({ value: t.key, label: t.label }))}
            value={tier}
            onChange={setTier}
          />
          <SegmentedControl
            label="Loan term"
            options={[
              { value: '30', label: '30-year' },
              { value: '15', label: '15-year' },
            ]}
            value={termKey}
            onChange={setTermKey}
          />
          <NumberField label="Household income ($/yr)" value={income} onChange={setIncome} min={0} max={2_000_000} prefix="$" precision={0} />
          <NumberField
            label="Other debt payments ($/mo)"
            value={debts}
            onChange={setDebts}
            min={0}
            max={20_000}
            prefix="$"
            precision={0}
          />
        </div>
        <p className={styles.footnote}>
          Your rate: <strong>{formatPercent(rate, 1)} APR</strong>. Rates are fixed at {HOUSING_YEAR}{' '}
          averages: 6.4% on a 30-year loan with excellent credit (Freddie Mac survey, July{' '}
          {HOUSING_YEAR}), about 0.3 points more for good credit and 1.1 points more for fair credit
          (myFICO rate tables), and 0.6 points less on a 15-year term. Ownership costs are fixed at
          national ballparks: property tax {formatPercent(COSTS.propertyTaxRate, 1)} and insurance{' '}
          {formatPercent(COSTS.insuranceRate, 1)} of the home&rsquo;s value per year, plus PMI of{' '}
          {formatPercent(COSTS.pmiRate, 1)} of the loan when the down payment is under 20%.
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
          {surface === 'rate' && <RateView m={m} tier={tier} />}
          {surface === 'taxes' && <HomeTaxView m={m} income={income} />}
          {surface === 'math' && <HousingMathView m={m} afford={afford} income={income} debts={debts} />}
        </Card>
        <Callout tone="plain" label="Educational model, not lending advice">
          This simplification fixes rates, property tax, insurance, and PMI at {HOUSING_YEAR}{' '}
          averages, and it skips closing costs, points, HOA dues, maintenance, rate locks, and local
          variation in taxes and insurance. Real quotes depend on the full application. It shows the
          structure of the decision, not a preapproval.
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
        hint="The sticker price becomes a monthly cost. The loan payment is the biggest piece, but taxes and insurance ride along with it, and lenders count all of it."
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
        caption={`Each year's payments on the ${formatUSDWhole(m.loan)} loan, split between interest (red) and principal (green). The total is the same every year; what changes is who it goes to. ${
          m.crossoverYear
            ? `Not until year ${m.crossoverYear} does more of the payment build your equity than pay the bank.`
            : ''
        }`}
        exportStats={[
          { label: 'Monthly P&I', value: formatUSDWhole(m.pi), color: SLATE },
          { label: 'Total interest', value: formatUSDWhole(m.totalInterest), color: CARDINAL },
          { label: 'Loan', value: `${formatUSDWhole(m.loan)} · ${formatPercent(m.rate, 1)} · ${m.termYears}yr` },
        ]}
      />

      {m.hasPmi && (
        <Callout tone="mark" label="The cost of a small down payment">
          With {formatPercent(m.downPct, 0)} down, the lender requires private mortgage insurance:{' '}
          <strong>{formatUSDWhole(m.pmiMonthly)}</strong> per month that buys you nothing. It
          protects the lender, not you, and it stays until your equity reaches 20%.
        </Callout>
      )}
      <Callout tone="note" label="Why the first years feel slow">
        Interest is charged on the balance you still owe, and at the start you owe the most. Of the
        first {formatUSDWhole(m.pi)} payment, <strong>{formatUSDWhole(m.firstMonthInterest)}</strong>{' '}
        is interest and only <strong>{formatUSDWhole(m.firstMonthPrincipal)}</strong> pays down the
        loan. Every payment tilts the split a little further toward you.
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
        hint="Lenders apply two ceilings. Housing costs alone should stay under 28% of gross monthly income, and housing plus every other debt payment should stay under 36%. The lower ceiling wins."
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
          value={afford.maxTotalMonthly}
          format={formatUSDWhole}
          note={`36% of income minus ${formatUSDWhole(debts)} in other debt payments`}
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
        The binding ceiling is the <strong>{afford.binding === 'housing' ? '28% housing ratio' : '36% total-debt ratio'}</strong>
        {afford.binding === 'debts'
          ? ': your other debt payments eat into the room the lender allows for housing.'
          : ': your other debts are light enough that housing costs set the limit.'}{' '}
        At {formatPercent(m.rate, 1)} with {formatPercent(m.downPct, 0)} down, each $100,000 of
        home price costs about {formatUSDWhole(afford.costPerDollar * 100_000)} per month, so the{' '}
        {formatUSDWhole(afford.maxMonthly)} budget supports a {formatUSDWhole(afford.maxPrice)} home.
      </p>

      <Callout tone={fits ? 'note' : 'mark'} label={fits ? 'This home fits the guideline' : 'This home breaks the guideline'}>
        {fits ? (
          <>
            The {formatUSDWhole(m.price)} home costs <strong>{formatUSDWhole(m.piti)}</strong> per
            month, under the <strong>{formatUSDWhole(afford.maxMonthly)}</strong> ceiling. A lender
            following the 28/36 rule would consider this affordable at your income.
          </>
        ) : (
          <>
            The {formatUSDWhole(m.price)} home costs <strong>{formatUSDWhole(m.piti)}</strong> per
            month, over the <strong>{formatUSDWhole(afford.maxMonthly)}</strong> ceiling. A lender
            following the 28/36 rule would push back, and a budget probably should too.
          </>
        )}
      </Callout>
      <Callout tone="note" label="Other debts shrink the house">
        The 36% ceiling counts car loans, student loans, and credit card minimums against the same
        budget as the mortgage. Paying down a $350 car payment does not just free up $350 a month;
        it can raise the price a lender approves by tens of thousands of dollars. Debt you carry
        into house-hunting decides the house.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function RateView({ m, tier }: { m: MortgageResult; tier: CreditTier }) {
  const other: TermYears = m.termYears === 30 ? 15 : 30
  const otherM = useMemo(
    () => computeMortgage(m.price, m.downPct, rateFor(tier, other), other),
    [m.price, m.downPct, tier, other]
  )
  const m30 = m.termYears === 30 ? m : otherM
  const m15 = m.termYears === 15 ? m : otherM
  const fair = computeMortgage(m.price, m.downPct, rateFor('fair', m.termYears), m.termYears)
  const excellent = computeMortgage(m.price, m.downPct, rateFor('excellent', m.termYears), m.termYears)

  return (
    <>
      <StepHeader
        title="The same house, priced by your credit score"
        hint="The seller gets the same amount either way. What changes with the rate is how much the bank collects from you over the years, and the rate follows the credit score."
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
        caption={`Monthly principal and interest on the ${formatUSDWhole(m.loan)} loan across rates, with the three credit tiers marked. The curve is why buyers watch the Fed: a one-point move changes this payment by roughly ${formatUSDWhole(Math.abs(computeMortgage(m.price, m.downPct, m.rate + 0.01, m.termYears).pi - m.pi))} a month.`}
        exportStats={[
          { label: 'Excellent (760+)', value: `${formatUSDWhole(excellent.pi)}/mo`, color: GREEN },
          { label: 'Fair (~640)', value: `${formatUSDWhole(fair.pi)}/mo`, color: CARDINAL },
          { label: 'Loan', value: `${formatUSDWhole(m.loan)} · ${m.termYears}yr` },
        ]}
      />

      <p className={styles.bracketGroupTitle}>30-year vs. 15-year, at your credit tier</p>
      <div className={styles.stats}>
        <Stat label="30-year payment" value={m30.pi} format={formatUSDWhole} note={`${formatPercent(m30.rate, 1)} APR`} />
        <Stat label="15-year payment" value={m15.pi} format={formatUSDWhole} note={`${formatPercent(m15.rate, 1)} APR, lower rate but higher payment`} />
        <Stat label="30-year total interest" value={m30.totalInterest} format={formatUSDWhole} accentColor={CARDINAL} />
        <Stat
          label="15-year total interest"
          value={m15.totalInterest}
          format={formatUSDWhole}
          accentColor={GREEN}
          note={`saves ${formatUSDWhole(m30.totalInterest - m15.totalInterest)} in interest`}
        />
      </div>

      <Callout tone="note" label="The trade behind the terms">
        The 15-year loan carries a lower rate and builds equity twice as fast, but the payment is{' '}
        <strong>{formatUSDWhole(m15.pi - m30.pi)}</strong> a month higher. Buyers who need the
        smaller payment to fit the 28% guideline take the 30-year; buyers with room in the budget
        buy back <strong>{formatUSDWhole(m30.totalInterest - m15.totalInterest)}</strong> of
        interest by choosing 15.
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
        hint="Mortgage interest and property taxes are deductible, but only if you itemize, and itemizing only pays when those deductions beat the standard deduction everyone gets for free."
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
            fall short of the {formatUSDWhole(ht.standard)} standard deduction, so this buyer keeps
            the standard deduction and the home changes nothing on the return.
          </>
        )}
      </p>

      <Callout tone="note" label="The folk wisdom is out of date">
        &ldquo;Buy a house for the tax break&rdquo; made sense when the standard deduction was
        small. Today a married couple starts with {formatUSDWhole(ht.standard)} for free, so a
        typical loan&rsquo;s interest often does not clear the bar, and the first{' '}
        {formatUSDWhole(ht.standard)} of a homeowner&rsquo;s deductions replaces something they
        already had. Run the comparison before counting the tax break in the budget. State income
        taxes share the same {formatUSDWhole(ht.saltCap)} cap and can tip the answer; this page
        counts only property tax.
      </Callout>
      <Callout tone="note" label="The tax breaks that matter more">
        Two housing tax rules dwarf the deduction for most owners. Living in the home is untaxed
        income (renting the same house would be paid with after-tax dollars), and up to{' '}
        {formatUSDWhole(status === 'mfj' ? 500_000 : 250_000)} of gain when you sell a primary
        residence is tax-free. Both arrive without itemizing anything.
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
        hint="The same calculations the tool runs, written out with your inputs substituted in. Change the panel and the derivations update."
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
