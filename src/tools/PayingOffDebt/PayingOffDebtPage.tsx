import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  ScenarioChip,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Toggle,
} from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
// Shared chart canvas from the lesson family.
import { StationChart } from '../ChanceOwnership/components/StationChart'
import { buildSchedule, firstMonthInterest, padTo, paymentFor } from './compute'
import styles from './PayingOffDebtPage.module.css'

/*
 * Paying off Debt: installment loans for the Debt Management & FICO Scores
 * session. A set amount borrowed becomes a stream of equal payments; the tool
 * solves the lecture's two questions (how long a budgeted payment takes, and
 * what payment a term requires) and shows the interest/principal split inside
 * each payment.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'

type Mode = 'payment' | 'term'

interface Preset {
  label: string
  pv: number
  apr: number
  mode: Mode
  payment: number
  years: number
}

/* The lecture's own numbers: slides 27 and 29 (the $10,000 credit card debt)
 * and slide 36 (the average student loan balance on the standard plan). */
const PRESETS: Preset[] = [
  { label: '$10,000 of debt at 23%, paying $250 a month', pv: 10000, apr: 23, mode: 'payment', payment: 250, years: 10 },
  { label: 'The same debt, paying $500 a month', pv: 10000, apr: 23, mode: 'payment', payment: 500, years: 10 },
  { label: 'Student loan: $37,850 at 6.5% over 10 years', pv: 37850, apr: 6.5, mode: 'term', payment: 250, years: 10 },
]

const fmtMonths = (m: number) => (Number.isFinite(m) ? `${m} months` : 'Never')
const fmtYears = (m: number) => {
  const y = m / 12
  return y >= 1 ? `about ${y.toFixed(1).replace(/\.0$/, '')} years of payments` : 'under a year of payments'
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function PayingOffDebtPage({ intro = true }: { intro?: boolean } = {}) {
  const [pv, setPv] = useState(10000)
  const [apr, setApr] = useState(23)
  const [mode, setMode] = useState<Mode>('payment')
  const [payment, setPayment] = useState(250)
  const [years, setYears] = useState(10)
  const [showCompare, setShowCompare] = useState(false)

  const applyPreset = (p: Preset) => {
    setPv(p.pv)
    setApr(p.apr)
    setMode(p.mode)
    setPayment(p.payment)
    setYears(p.years)
  }
  const presetActive = (p: Preset) =>
    p.pv === pv && p.apr === apr && p.mode === mode && (mode === 'payment' ? p.payment === payment : p.years === years)

  // The loan under the chosen settings, plus the lesson's comparison: double
  // the payment (slides 27 to 29) or stretch the term to twice as long.
  const termPayment = useMemo(() => paymentFor(pv, apr, years), [pv, apr, years])
  const main = useMemo(
    () => buildSchedule(pv, apr, mode === 'payment' ? payment : termPayment),
    [pv, apr, mode, payment, termPayment]
  )
  const stretchYears = Math.min(30, years * 2)
  const canCompare = mode === 'payment' || stretchYears > years
  const compare = useMemo(
    () =>
      !showCompare || !canCompare
        ? null
        : mode === 'payment'
          ? buildSchedule(pv, apr, payment * 2)
          : buildSchedule(pv, apr, paymentFor(pv, apr, stretchYears)),
    [pv, apr, mode, payment, stretchYears, showCompare, canCompare]
  )

  const monthlyInterest = firstMonthInterest(pv, apr)
  // How far the chart actually runs: 20 years when the payment loses to the
  // interest, 100 years when the loan clears but not before the cutoff.
  const plottedYears = Math.round(main.plottedMonths / 12)
  const timeToPayOff = main.neverEnds
    ? main.paymentBelowInterest
      ? 'Never'
      : `Over ${plottedYears} years`
    : fmtMonths(main.months)
  const compColor = mode === 'payment' ? GREEN : GOLD
  const compLabel =
    mode === 'payment'
      ? `At double the payment (${formatUSDWhole(payment * 2)})`
      : `Stretched to ${stretchYears} years (${formatUSDWhole(compare?.payment ?? 0)}/mo)`

  const chartX = compare && compare.x.length > main.x.length ? compare.x : main.x
  const yMax = Math.max(...main.balance, ...(compare?.balance ?? [0]), pv) * 1.05

  const compareSentence = !compare || compare.neverEnds
    ? ''
    : mode === 'payment'
      ? ` Doubling the payment ends it in ${compare.months} months and cuts the interest to ${formatUSDWhole(compare.totalInterest)}.`
      : ` Stretched to ${stretchYears} years, the payment falls to $${compare.payment.toFixed(2)} but the interest grows to ${formatUSDWhole(compare.totalInterest)}.`
  const caption = main.neverEnds
    ? main.paymentBelowInterest
      ? `${formatUSDWhole(payment)} a month never clears ${formatUSDWhole(pv)} at ${apr}%: interest accrues faster than the payment. Shown over ${plottedYears} years.${compareSentence}`
      : `${formatUSDWhole(payment)} a month does reduce ${formatUSDWhole(pv)} at ${apr}%, but paying it off would take longer than the ${plottedYears} years shown.${compareSentence}`
    : mode === 'payment'
      ? `${formatUSDWhole(pv)} at ${apr}%, paying ${formatUSDWhole(payment)} a month, takes ${main.months} months to clear and costs ${formatUSDWhole(main.totalInterest)} in interest.${compareSentence}`
      : `Repaying ${formatUSDWhole(pv)} at ${apr}% over ${years} years takes $${main.payment.toFixed(2)} a month and ${formatUSDWhole(main.totalInterest)} of interest.${compareSentence}`

  const splitYMax = Math.max(main.payment, ...main.interestPart) * 1.15

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Debt management</p>
          <h1 className={styles.h1}>Paying off Debt</h1>
          <p className={styles.lead}>
            An installment loan turns an amount borrowed today into a stream of equal monthly
            payments. Solve for how long a payment takes to clear a debt, or what a term costs per
            month.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.stack}>
        <StepHeader
          title="Turn a debt into a stream of payments"
          hint="Set the loan, then start from what you know: the payment your budget allows, or the term of the loan."
        />

        <div className={styles.chipsRow}>
          {PRESETS.map((p) => (
            <ScenarioChip key={p.label} label={p.label} active={presetActive(p)} onClick={() => applyPreset(p)} />
          ))}
        </div>

        <SegmentedControl
          label="Start from"
          options={[
            { value: 'payment', label: 'The monthly payment' },
            { value: 'term', label: 'The repayment term' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className={styles.controlsRow}>
          <Slider label="Amount borrowed" value={pv} onChange={setPv} min={500} max={100000} step={500} editable prefix="$" />
          <Slider
            label="Interest rate (APR)"
            value={apr}
            onChange={setApr}
            min={0}
            max={36}
            step={0.25}
            editable
            suffix="%"
            precision={2}
          />
          {mode === 'payment' ? (
            <Slider
              label="Monthly payment"
              value={payment}
              onChange={setPayment}
              min={25}
              max={2500}
              step={25}
              editable
              prefix="$"
            />
          ) : (
            <Slider
              label="Repayment term"
              value={years}
              onChange={setYears}
              min={1}
              max={30}
              step={1}
              editable
              suffix={years > 1 ? 'yrs' : 'yr'}
            />
          )}
        </div>

        <div className={styles.stats}>
          {mode === 'payment' ? (
            <Stat
              label="Time to pay off"
              value={Number.isFinite(main.months) ? main.months : 0}
              format={() => timeToPayOff}
              emphasis
              accentColor={main.neverEnds ? RED : undefined}
              note={
                main.neverEnds
                  ? main.paymentBelowInterest
                    ? 'the payment does not cover the interest'
                    : `longer than the ${plottedYears} years shown`
                  : fmtYears(main.months)
              }
              animate={false}
            />
          ) : (
            <Stat
              label="Monthly payment"
              value={main.payment}
              format={(v) => `$${v.toFixed(2)}/mo`}
              emphasis
              note={`${years * 12} equal payments`}
              animate={false}
            />
          )}
          <Stat
            label="Total paid"
            value={main.totalPaid}
            format={(v) => (main.neverEnds ? '—' : formatUSDWhole(v))}
            animate={false}
          />
          <Stat
            label="Interest paid"
            value={main.totalInterest}
            format={(v) => (main.neverEnds ? '—' : formatUSDWhole(v))}
            accentColor={RED}
            note={main.neverEnds ? undefined : `on ${formatUSDWhole(pv)} borrowed`}
            animate={false}
          />
          {mode === 'payment' && compare && !compare.neverEnds && (
            <Stat
              label={`At ${formatUSDWhole(payment * 2)} a month`}
              value={compare.months}
              format={(v) => `${Math.round(v)} months`}
              accentColor={GREEN}
              note={
                main.neverEnds
                  ? main.paymentBelowInterest
                    ? 'instead of never'
                    : `instead of more than ${plottedYears} years`
                  : `${main.months - compare.months} months sooner, ${formatUSDWhole(main.totalInterest - compare.totalInterest)} less interest`
              }
              animate={false}
            />
          )}
        </div>

        {main.paymentBelowInterest && (
          <Callout tone="mark" label="This payment loses to the interest">
            Interest on {formatUSDWhole(pv)} at {apr}% runs {formatUSDWhole(monthlyInterest)} a
            month. A payment below that never reaches the principal, so the balance grows.
          </Callout>
        )}
        {main.neverEnds && !main.paymentBelowInterest && (
          <Callout tone="mark" label="This payment barely beats the interest">
            Interest on {formatUSDWhole(pv)} at {apr}% runs {formatUSDWhole(monthlyInterest)} a
            month, so only {formatUSDWhole(payment - monthlyInterest)} of the first payment reaches
            the principal. The loan does shrink, but clearing it would take longer than the{' '}
            {plottedYears} years shown.
          </Callout>
        )}

        <div className={styles.chartBar}>
          <div className={styles.legend}>
            <span style={{ color: RED }}>&#9632; balance at your settings</span>
            {compare && (
              <span style={{ color: compColor }}>&#9476; {compLabel.toLowerCase()}</span>
            )}
          </div>
          {canCompare && (
            <Toggle
              label={
                mode === 'payment'
                  ? `Double the payment (${formatUSDWhole(payment * 2)})`
                  : `Stretch to ${stretchYears} years`
              }
              checked={showCompare}
              onChange={setShowCompare}
            />
          )}
        </div>
        <StationChart
          x={chartX}
          yMax={yMax}
          lines={[
            ...(compare
              ? [{ ys: padTo(compare.balance, chartX.length), color: compColor, width: 2, dashed: true, label: compLabel }]
              : []),
            {
              ys: padTo(main.balance, chartX.length),
              color: RED,
              width: 3,
              label: mode === 'payment' ? `At ${formatUSDWhole(payment)} a month` : `At the ${years}-year payment`,
            },
          ]}
          xTickFormat={(v) => `${Math.round(v)} mo`}
          xHoverLabel={(v) => `Month ${Math.round(v)}`}
          ratio={0.42}
          maxHeight={480}
          figure="Figure 1."
          caption={caption}
          ariaLabel="Remaining loan balance by month under the chosen payment"
          exportStats={[
            mode === 'payment'
              ? { label: 'Time to pay off', value: timeToPayOff, color: main.neverEnds ? RED : undefined }
              : { label: 'Monthly payment', value: `$${main.payment.toFixed(2)}` },
            { label: 'Total paid', value: main.neverEnds ? '—' : formatUSDWhole(main.totalPaid) },
            { label: 'Interest paid', value: main.neverEnds ? '—' : formatUSDWhole(main.totalInterest), color: RED },
          ]}
        />

        <Callout tone="mark" label="Stretching the term">
          A longer horizon lowers the payment and raises the total interest. Compare the interest
          totals, not just the payments.
        </Callout>

        <StepHeader
          title="Where each payment goes"
          hint="Each installment pays the month's interest first; only the rest reduces the debt."
        />
        <div className={styles.legend}>
          <span style={{ color: RED }}>&#9632; interest share of the payment</span>
          <span style={{ color: GREEN }}>&#9632; principal share of the payment</span>
        </div>
        <StationChart
          x={main.splitX}
          yMax={splitYMax}
          lines={[
            { ys: main.interestPart, color: RED, width: 3, label: 'Interest share' },
            { ys: main.principalPart, color: GREEN, width: 3, label: 'Principal share' },
          ]}
          xTickFormat={(v) => `${Math.round(v)} mo`}
          xHoverLabel={(v) => `Payment ${Math.round(v)}`}
          figure="Figure 2."
          caption={
            main.paymentBelowInterest
              ? 'Every dollar of the payment goes to interest, and the debt still grows.'
              : 'Interest is charged on the remaining balance, so early payments are interest-heavy and the split shifts toward principal as the debt falls.'
          }
          ariaLabel="Interest and principal share of each monthly payment"
          exportStats={[
            { label: 'First payment: interest', value: formatUSDWhole(Math.min(monthlyInterest, main.payment)), color: RED },
            {
              label: 'First payment: principal',
              value: formatUSDWhole(Math.max(0, main.payment - monthlyInterest)),
              color: GREEN,
            },
          ]}
        />

        <StepHeader title="The math" hint="The installment-loan equation, solved both ways." />
        <FormulaBlock
          tex={`PV \\;=\\; PMT \\cdot \\frac{1 - (1+i)^{-N}}{i}`}
          caption="The amount borrowed equals the present value of the payments. i is the monthly rate (APR ÷ 12); N is the number of payments."
        />
        <FormulaBlock
          tex={`N \\;=\\; \\frac{-\\ln\\!\\left(1 - i \\cdot PV / PMT\\right)}{\\ln(1+i)}`}
          caption="Solved for the horizon. A solution exists only when the payment beats the month's interest, i × PV."
          muted
        />
        <Callout tone="note" label="The same five keys">
          This is the TVM calculator with FV = 0: the amount borrowed is PV, the payment is PMT,
          the rate is I/Y, the horizon is N. Any number here can be reproduced on the TVM
          Calculator in Foundations.
        </Callout>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Interest accrues monthly on the
        remaining balance, no fees, and the final payment is whatever is left. The presets are the
        lecture&rsquo;s examples.
      </p>
    </div>
  )
}
