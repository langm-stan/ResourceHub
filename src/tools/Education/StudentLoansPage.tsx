import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  MathSection,
  ScenarioChip,
  SegmentedControl,
  Slider,
  Stat,
  Tabs,
  type TabItem,
} from '../../design-system'
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { formatPercent, formatUSDWhole, texNumber, texUSD } from '../../lib/format'
import { compareLoans, type LoanInputs } from './loanCompute'
import styles from './EducationPage.module.css'

/*
 * Student loans, and what the word subsidized is worth. A subsidized loan
 * charges no interest while the borrower is enrolled or in the grace period;
 * an unsubsidized one charges it throughout and folds it into the balance
 * before the first payment. Because the subsidized borrower holds the money
 * for years and pays nothing, the rate actually paid over the life of the
 * loan comes out below the rate printed on it.
 */

const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

type Surface = 'compare' | 'balance' | 'terms' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'compare', label: 'Subsidized or not' },
  { value: 'balance', label: 'The balance' },
  { value: 'terms', label: 'Repayment options' },
  { value: 'math', label: 'The math' },
]

interface Preset {
  id: string
  label: string
  inputs: LoanInputs
}

const PRESETS: Preset[] = [
  {
    id: 'freshman',
    label: 'One freshman-year loan',
    inputs: {
      principal: 5500,
      aprPct: 3.73,
      yearsInSchool: 4,
      graceYears: 1,
      repayYears: 10,
      periodsPerYear: 1,
    },
  },
  {
    id: 'average',
    label: 'The average federal balance',
    inputs: {
      principal: 39547,
      aprPct: 6.5,
      yearsInSchool: 0,
      graceYears: 0,
      repayYears: 10,
      periodsPerYear: 12,
    },
  },
]

const PERIODS: { value: '1' | '12'; label: string }[] = [
  { value: '1', label: 'Yearly' },
  { value: '12', label: 'Monthly' },
]

export function StudentLoansPage({ intro = true }: { intro?: boolean } = {}) {
  const [inputs, setInputs] = useState<LoanInputs>(PRESETS[0]!.inputs)
  const [active, setActive] = useState<Surface>('compare')
  const set = (patch: Partial<LoanInputs>) => setInputs((prev) => ({ ...prev, ...patch }))

  const c = useMemo(() => compareLoans(inputs), [inputs])
  const currentPreset = PRESETS.find((p) => JSON.stringify(p.inputs) === JSON.stringify(inputs))?.id
  const perPayment = inputs.periodsPerYear === 12 ? 'a month' : 'a year'

  const years = c.unsubsidized.balancePath.map((p) => p.year)
  const yMax = Math.max(...c.unsubsidized.balancePath.map((p) => p.balance)) * 1.12 || 1

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson &middot; Investing in education</p>
          <h1 className={styles.h1}>Student Loans</h1>
          <p className={styles.lead}>
            Subsidized and unsubsidized loans, the payment on each, and the rate paid over the
            life of the loan.
          </p>
        </header>
      )}

      <div className={styles.stack}>
        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Examples</span>
          {PRESETS.map((p) => (
            <ScenarioChip
              key={p.id}
              label={p.label}
              active={currentPreset === p.id}
              onClick={() => setInputs(p.inputs)}
            />
          ))}
        </div>

        <Card tone="raised" className={styles.panel}>
          <div className={styles.controls}>
            <Slider
              label="Amount borrowed"
              value={inputs.principal}
              onChange={(principal) => set({ principal })}
              min={1000}
              max={100000}
              step={500}
              editable
              inputMax={500000}
              prefix="$"
            />
            <Slider
              label="Stated rate"
              value={inputs.aprPct}
              onChange={(aprPct) => set({ aprPct })}
              min={0}
              max={15}
              step={0.01}
              editable
              inputMax={30}
              suffix="%"
              precision={2}
            />
            <Slider
              label="Years still enrolled"
              value={inputs.yearsInSchool}
              onChange={(yearsInSchool) => set({ yearsInSchool })}
              min={0}
              max={8}
              step={1}
              editable
              suffix="years"
              note="Counted from the day the money arrives."
            />
            <Slider
              label="Grace period after leaving"
              value={inputs.graceYears}
              onChange={(graceYears) => set({ graceYears })}
              min={0}
              max={3}
              step={0.5}
              editable
              suffix="years"
              note="Federal loans normally allow six months."
            />
            <Slider
              label="Years of repayment"
              value={inputs.repayYears}
              onChange={(repayYears) => set({ repayYears })}
              min={1}
              max={30}
              step={1}
              editable
              suffix="years"
              note="The standard federal plan runs ten."
            />
            <SegmentedControl
              label="Payments"
              options={PERIODS}
              value={String(inputs.periodsPerYear) as '1' | '12'}
              onChange={(v) => set({ periodsPerYear: v === '12' ? 12 : 1 })}
            />
          </div>
        </Card>

        <div className={styles.stats}>
          <Stat
            label="Payment, subsidized"
            value={c.subsidized.payment}
            format={formatUSDWhole}
            accentColor={GREEN}
            note={`each payment, ${perPayment}`}
          />
          <Stat
            label="Payment, unsubsidized"
            value={c.unsubsidized.payment}
            format={formatUSDWhole}
            accentColor={SLATE}
            note={`each payment, ${perPayment}`}
          />
          <Stat
            label="The subsidy is worth"
            value={c.subsidyValue}
            format={formatUSDWhole}
            emphasis
            accentColor={GREEN}
            note="difference in total paid"
          />
          <Stat
            label="Rate actually paid"
            value={c.subsidized.impliedAnnualRate}
            format={(v) => formatPercent(v, 2)}
            note={`subsidized, against ${formatPercent(inputs.aprPct / 100, 2)} stated`}
          />
        </div>

        <div className={styles.tabRow}>
          <Tabs items={TABS} value={active} onChange={setActive} />
        </div>

        <Card tone="raised" className={styles.panel}>
          {active === 'compare' && (
            <>
              <div className={styles.compare}>
                <div>
                  <p className={styles.compareHead}>
                    <span className={styles.swatch} style={{ background: GREEN }} aria-hidden="true" />
                    Subsidized
                  </p>
                  <div className={styles.compareRows}>
                    <Stat
                      label="Owed when repayment starts"
                      value={c.subsidized.balanceAtRepayment}
                      format={formatUSDWhole}
                      note="no interest while enrolled or in grace"
                    />
                    <Stat label="Total paid" value={c.subsidized.totalPaid} format={formatUSDWhole} />
                    <Stat
                      label="Interest paid"
                      value={c.subsidized.totalInterest}
                      format={formatUSDWhole}
                    />
                    <Stat
                      label="Rate actually paid"
                      value={c.subsidized.impliedAnnualRate}
                      format={(v) => formatPercent(v, 2)}
                    />
                  </div>
                </div>
                <div>
                  <p className={styles.compareHead}>
                    <span className={styles.swatch} style={{ background: SLATE }} aria-hidden="true" />
                    Unsubsidized
                  </p>
                  <div className={styles.compareRows}>
                    <Stat
                      label="Owed when repayment starts"
                      value={c.unsubsidized.balanceAtRepayment}
                      format={formatUSDWhole}
                      note={`${formatUSDWhole(c.unsubsidized.interestBeforeRepayment)} of interest added first`}
                    />
                    <Stat
                      label="Total paid"
                      value={c.unsubsidized.totalPaid}
                      format={formatUSDWhole}
                    />
                    <Stat
                      label="Interest paid"
                      value={c.unsubsidized.totalInterest}
                      format={formatUSDWhole}
                    />
                    <Stat
                      label="Rate actually paid"
                      value={c.unsubsidized.impliedAnnualRate}
                      format={(v) => formatPercent(v, 2)}
                    />
                  </div>
                </div>
              </div>
              <Callout tone="mark" label="The stated rate and the rate paid">
                Both loans are written at {formatPercent(inputs.aprPct / 100, 2)}. The unsubsidized
                borrower pays that rate. The subsidized borrower holds{' '}
                {formatUSDWhole(inputs.principal)} for {c.deferYears}{' '}
                {c.deferYears === 1 ? 'year' : 'years'} before any interest or payment, so the rate
                over the life of the loan is {formatPercent(c.subsidized.impliedAnnualRate, 2)}.
              </Callout>
            </>
          )}

          {active === 'balance' && (
            <>
              <p className={styles.legend}>
                <span style={{ color: GREEN }}>&#9632; subsidized</span>
                <span style={{ color: SLATE }}>&#9632; unsubsidized</span>
              </p>
              <StationChart
                x={years}
                lines={[
                  {
                    ys: c.unsubsidized.balancePath.map((p) => p.balance),
                    color: SLATE,
                    width: 2,
                    label: 'Unsubsidized',
                  },
                  {
                    ys: c.subsidized.balancePath.map((p) => p.balance),
                    color: GREEN,
                    width: 2,
                    label: 'Subsidized',
                  },
                ]}
                yMax={yMax}
                xRef={c.deferYears}
                xRefLabel="repayment starts"
                xTickFormat={(v) => `yr ${v.toFixed(0)}`}
                xHoverLabel={(v: number) => `Year ${v.toFixed(0)}`}
                ariaLabel="What is owed on each loan, year by year"
                caption={`What is owed from the day the money arrives to the last payment. The subsidized balance holds at ${formatUSDWhole(inputs.principal)} for ${c.deferYears} ${c.deferYears === 1 ? 'year' : 'years'}; the unsubsidized balance reaches ${formatUSDWhole(c.unsubsidized.balanceAtRepayment)}.`}
              />
              <p className={styles.note}>
                Both loans are repaid over the same {inputs.repayYears} years, so the larger balance
                carries the larger payment for the whole term.
              </p>
            </>
          )}

          {active === 'terms' && (
            <>
              <dl className={styles.termsList}>
                <div>
                  <dt>Deferment</dt>
                  <dd>
                    Payments are pushed into the future without penalty. On a subsidized loan
                    interest does not accrue during deferment; on an unsubsidized one it does.
                  </dd>
                </div>
                <div>
                  <dt>Forbearance</dt>
                  <dd>
                    Payments are reduced or paused for up to twelve months. Interest accrues on the
                    balance either way, so the amount owed grows while payments are on hold.
                  </dd>
                </div>
                <div>
                  <dt>Income-driven repayment</dt>
                  <dd>
                    The payment is set from income and family size rather than the balance, for
                    borrowers whose payments are high against what they earn.
                  </dd>
                </div>
                <div>
                  <dt>Public Service Loan Forgiveness</dt>
                  <dd>
                    For borrowers employed by government or a not-for-profit, including military
                    service, the remaining balance on direct loans is forgiven after the equivalent
                    of 120 monthly payments under an accepted plan.
                  </dd>
                </div>
              </dl>
              <Callout tone="mark" label="Repayment and bankruptcy">
                A student loan must be repaid. The government can garnish wages, tax refunds, and
                Social Security payments. Discharge in bankruptcy requires a separate action, an
                adversary proceeding, in which the court finds that repayment would impose undue
                hardship.
              </Callout>
            </>
          )}

          {active === 'math' && (
            <MathSection
              title="The math"
              hint="The payment is set by the balance when repayment starts. The rate paid compares that stream with the amount borrowed."
              rows={[
                {
                  tex: String.raw`PMT = \frac{B \times i}{1-(1+i)^{-n}}`,
                  caption:
                    'The level payment that clears a balance B over n periods at the periodic rate i.',
                },
                {
                  tex: String.raw`PMT = \frac{${texUSD(c.subsidized.balanceAtRepayment)} \times ${texNumber(inputs.aprPct / 100 / inputs.periodsPerYear, 5)}}{1-(1+${texNumber(inputs.aprPct / 100 / inputs.periodsPerYear, 5)})^{-${texNumber(inputs.repayYears * inputs.periodsPerYear)}}} = \boxed{${texUSD(c.subsidized.payment)}}`,
                  caption: 'Subsidized: the balance is still the amount borrowed.',
                  muted: true,
                },
                {
                  tex: String.raw`B = ${texUSD(inputs.principal)} \times (1+${texNumber(inputs.aprPct / 100 / inputs.periodsPerYear, 5)})^{${texNumber(c.deferYears * inputs.periodsPerYear)}} = \boxed{${texUSD(c.unsubsidized.balanceAtRepayment)}}`,
                  caption: `Unsubsidized: interest runs for ${c.deferYears} ${c.deferYears === 1 ? 'year' : 'years'} and is added to the balance.`,
                  muted: true,
                },
                {
                  tex: String.raw`${texUSD(inputs.principal)} = \sum_{k=${texNumber(c.deferYears * inputs.periodsPerYear + 1)}}^{${texNumber(c.deferYears * inputs.periodsPerYear + inputs.repayYears * inputs.periodsPerYear)}} \frac{${texUSD(c.subsidized.payment)}}{(1+x)^{k}} \Rightarrow \boxed{${formatPercent(c.subsidized.impliedAnnualRate, 2)}}`,
                  caption: 'The rate at which the payments equal the amount borrowed.',
                  muted: true,
                },
              ]}
              note={`On an unsubsidized loan the stated rate and the rate paid are the same. On a subsidized loan they differ by the ${c.deferYears} ${c.deferYears === 1 ? 'year' : 'years'} before interest and payments begin.`}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
