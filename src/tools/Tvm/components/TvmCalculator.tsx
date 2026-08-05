import { useMemo } from 'react'
import {
  Button,
  Callout,
  MathSection,
  NumberField,
  SegmentedControl,
  SelectField,
  Toggle,
  type MathRow,
  type Segment,
} from '../../../design-system'
import {
  FinanceInputError,
  solveTvm,
  type TvmRegisters,
  type TvmVar,
} from '../../../lib/finance'
import { formatPercent, formatUSD, texNumber } from '../../../lib/format'
import { usePersistentState } from '../../../hooks/usePersistentState'
import styles from './TvmCalculator.module.css'

const KEYS: { var: TvmVar; label: string; help: string }[] = [
  { var: 'n', label: 'N', help: 'Number of periods' },
  { var: 'iy', label: 'I / Y', help: 'Annual rate (%)' },
  { var: 'pv', label: 'PV', help: 'Present value' },
  { var: 'pmt', label: 'PMT', help: 'Payment / period' },
  { var: 'fv', label: 'FV', help: 'Future value' },
]

const SOLVE_OPTIONS: Segment<TvmVar>[] = KEYS.map((k) => ({ value: k.var, label: k.label }))

/** Common payment frequencies, daily through annually, plus free entry. */
const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: '365', label: 'Daily (365/yr)' },
  { value: '52', label: 'Weekly (52/yr)' },
  { value: '26', label: 'Every two weeks (26/yr)' },
  { value: '24', label: 'Twice a month (24/yr)' },
  { value: '12', label: 'Monthly (12/yr)' },
  { value: '4', label: 'Quarterly (4/yr)' },
  { value: '2', label: 'Twice a year (2/yr)' },
  { value: '1', label: 'Annually (1/yr)' },
  { value: 'custom', label: 'Custom…' },
]

const FREQUENCY_VALUES = FREQUENCY_OPTIONS.map((o) => o.value)

// Default: $100 a month at 8% for 30 years grows to about $149,000.
// PMT is −100 because the deposits are paid out (sign convention).
const DEFAULTS = { n: 360, iy: 8, pv: 0, pmt: -100, fv: 0, py: 12, due: false, solveFor: 'fv' as TvmVar }

/** The traditional five-key calculator: enter four, solve for the fifth. */
export function TvmCalculator() {
  // Values persist in localStorage so navigating away and back keeps them.
  const [n, setN] = usePersistentState('ifdm-tvm-calc-n', DEFAULTS.n)
  const [iy, setIy] = usePersistentState('ifdm-tvm-calc-iy', DEFAULTS.iy)
  const [pv, setPv] = usePersistentState('ifdm-tvm-calc-pv', DEFAULTS.pv)
  const [pmt, setPmt] = usePersistentState('ifdm-tvm-calc-pmt', DEFAULTS.pmt)
  const [fv, setFv] = usePersistentState('ifdm-tvm-calc-fv', DEFAULTS.fv)
  const [py, setPy] = usePersistentState('ifdm-tvm-calc-py', DEFAULTS.py)
  // 'Custom…' keeps P/Y freely adjustable; the presets cover daily → annually.
  const [customPy, setCustomPy] = usePersistentState('ifdm-tvm-calc-custom-py', false)
  const [due, setDue] = usePersistentState('ifdm-tvm-calc-due', DEFAULTS.due)
  const [solveFor, setSolveFor] = usePersistentState<TvmVar>('ifdm-tvm-calc-solve', DEFAULTS.solveFor, (v) =>
    KEYS.some((k) => k.var === v),
  )

  function reset() {
    setN(DEFAULTS.n)
    setIy(DEFAULTS.iy)
    setPv(DEFAULTS.pv)
    setPmt(DEFAULTS.pmt)
    setFv(DEFAULTS.fv)
    setPy(DEFAULTS.py)
    setCustomPy(false)
    setDue(DEFAULTS.due)
    setSolveFor(DEFAULTS.solveFor)
  }

  const frequencyValue = customPy || !FREQUENCY_VALUES.includes(String(py)) ? 'custom' : String(py)
  const pickFrequency = (v: string) => {
    if (v === 'custom') {
      setCustomPy(true)
    } else {
      setCustomPy(false)
      setPy(Number(v))
    }
  }

  const registers: TvmRegisters = { n, iy, pv, pmt, fv, py, due }

  const solved = useMemo(() => {
    try {
      return { value: solveTvm(registers, solveFor), error: null as string | null }
    } catch (e) {
      const msg = e instanceof FinanceInputError ? e.message : 'These values have no solution.'
      return { value: NaN, error: msg }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, iy, pv, pmt, fv, py, due, solveFor])

  function valueFor(v: TvmVar): number {
    switch (v) {
      case 'n':
        return n
      case 'iy':
        return iy
      case 'pv':
        return pv
      case 'pmt':
        return pmt
      case 'fv':
        return fv
    }
  }
  function setterFor(v: TvmVar): (x: number) => void {
    switch (v) {
      case 'n':
        return setN
      case 'iy':
        return setIy
      case 'pv':
        return setPv
      case 'pmt':
        return setPmt
      case 'fv':
        return setFv
    }
  }

  function displayValue(v: TvmVar, x: number): string {
    if (!Number.isFinite(x)) return '—'
    if (v === 'iy') return formatPercent(x / 100, 3)
    if (v === 'n') return `${Math.round(x * 100) / 100}`
    return formatUSD(x)
  }

  const answerKey = KEYS.find((k) => k.var === solveFor)!

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <SegmentedControl label="Solve for" options={SOLVE_OPTIONS} value={solveFor} onChange={setSolveFor} />
        <Button variant="quiet" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className={styles.grid}>
        {KEYS.map((k) => {
          const isAnswer = k.var === solveFor
          if (isAnswer) {
            return (
              <div key={k.var} className={`${styles.cell} ${styles.answer}`}>
                <span className={styles.key}>{k.label}</span>
                <span className={styles.keyHelp}>{k.help}</span>
                <span className={`${styles.answerValue} tnum`}>
                  {displayValue(k.var, solved.value)}
                </span>
              </div>
            )
          }
          return (
            <div key={k.var} className={styles.cell}>
              <span className={styles.key}>{k.label}</span>
              <span className={styles.keyHelp}>{k.help}</span>
              <NumberField
                value={valueFor(k.var)}
                onChange={setterFor(k.var)}
                prefix={k.var === 'pv' || k.var === 'pmt' || k.var === 'fv' ? '$' : undefined}
                suffix={k.var === 'iy' ? '%' : undefined}
                precision={k.var === 'n' ? 0 : k.var === 'iy' ? 3 : 2}
              />
            </div>
          )
        })}
      </div>

      <div className={styles.settings}>
        <SelectField
          label="Payments per year"
          value={frequencyValue}
          onChange={pickFrequency}
          options={FREQUENCY_OPTIONS}
        />
        {frequencyValue === 'custom' && (
          <NumberField
            label="Periods / year"
            value={py}
            onChange={(v) => setPy(Math.max(1, Math.round(v)))}
            min={1}
            max={365}
            precision={0}
          />
        )}
        <div className={styles.timing}>
          <Toggle
            label="Payments at the beginning (annuity due)"
            checked={due}
            onChange={setDue}
          />
        </div>
      </div>

      {solved.error ? (
        <Callout tone="mark" label="No solution">
          {solved.error}
        </Callout>
      ) : (
        <Callout tone="note" label="Answer">
          Solving for <strong>{answerKey.label}</strong> gives{' '}
          <strong>{displayValue(solveFor, solved.value)}</strong>. Amounts you receive are positive;
          amounts you pay out are negative, so a loan payment or a deposit shows as a negative
          number.
        </Callout>
      )}

      <MathSection
        hint="The one equation every financial calculator solves, with your registers substituted in."
        rows={workedRows(registers, solveFor, solved.value, solved.error != null)}
        note="One sign convention balances the three cash-flow keys: money you receive is positive, money you pay out is negative. The equation grows every cash flow to the same date and requires the total to come out to zero."
      />
    </div>
  )
}

/* KaTeX for a signed dollar register, e.g. −$100 → "-\$100". */
function texMoney(v: number): string {
  return v < 0 ? `-\\$${texNumber(-v, 2)}` : `\\$${texNumber(v, 2)}`
}

/**
 * The master equation, then the reader's own solve: the per-period rate, the
 * equation with the four known registers substituted and the unknown left as
 * its symbol, and the boxed answer. Follows the house symbolic → substituted
 * → evaluated convention.
 */
function workedRows(reg: TvmRegisters, solveFor: TvmVar, answer: number, errored: boolean): MathRow[] {
  const rows: MathRow[] = [
    {
      tex: `PV\\,(1+i)^{N} + PMT\\,\\dfrac{(1+i)^{N}-1}{i}\\,d + FV = 0`,
      caption:
        'The equation every financial calculator solves · i = (I/Y ÷ P/Y) ÷ 100, d = (1 + i) in begin mode, 1 otherwise',
    },
  ]
  if (errored || !Number.isFinite(answer)) return rows

  const solvingRate = solveFor === 'iy'
  const iy = solvingRate ? answer : reg.iy
  const i = iy / reg.py / 100
  const dTex = reg.due ? `\\,(1+i)` : ''

  // The per-period rate, the one derived register.
  if (!solvingRate) {
    rows.push({
      tex: `i = \\dfrac{I/Y \\div P/Y}{100} = \\dfrac{${texNumber(reg.iy, 3)} \\div ${reg.py}}{100} = ${texNumber(i, 6)}`,
      muted: true,
    })
  }

  // The equation with the knowns in and the unknown left standing.
  const sym = { n: 'N', iy: 'i', pv: 'PV', pmt: 'PMT', fv: 'FV' } as const
  const show = (v: TvmVar, x: number) => (solveFor === v ? sym[v] : texMoney(x))
  const nTex = solveFor === 'n' ? 'N' : `${texNumber(reg.n)}`
  const growth = solvingRate ? `(1+i)` : `(${texNumber(1 + i, 6)})`
  if (i === 0 && !solvingRate) {
    // At a 0% rate nothing grows; the cash flows simply have to add to zero.
    rows.push({
      tex: `${show('pv', reg.pv)} + ${show('pmt', reg.pmt)} \\cdot ${nTex} + ${show('fv', reg.fv)} = 0`,
      caption: 'At a 0% rate nothing grows, so the cash flows simply add to zero.',
      muted: true,
    })
  } else {
    rows.push({
      tex: `${show('pv', reg.pv)}\\,${growth}^{${nTex}} + ${show('pmt', reg.pmt)}\\,\\dfrac{${growth}^{${nTex}}-1}{${solvingRate ? 'i' : texNumber(i, 6)}}${solvingRate ? (reg.due ? dTex : '') : reg.due ? `\\,(${texNumber(1 + i, 6)})` : ''} + ${show('fv', reg.fv)} = 0`,
      caption: solvingRate
        ? 'No formula isolates the rate; the calculator searches for the i that balances the equation.'
        : solveFor === 'n'
          ? 'Taking logarithms isolates N.'
          : `Rearranging isolates ${sym[solveFor]}.`,
      muted: true,
    })
  }

  // The boxed answer, in the register's own units.
  if (solvingRate) {
    rows.push({
      tex: `i = ${texNumber(i, 6)} \\;\\Rightarrow\\; I/Y = i \\times ${reg.py} \\times 100 = \\boxed{${texNumber(answer, 3)}\\%}`,
      muted: true,
    })
  } else if (solveFor === 'n') {
    const years = reg.py > 0 ? answer / reg.py : NaN
    rows.push({
      tex: `N = \\boxed{${texNumber(answer, 2)}}\\ \\text{periods}${Number.isFinite(years) ? ` \\approx ${texNumber(years, 1)}\\ \\text{years}` : ''}`,
      muted: true,
    })
  } else {
    rows.push({ tex: `${sym[solveFor]} = \\boxed{${texMoney(answer)}}`, muted: true })
  }
  return rows
}
