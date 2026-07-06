import { useMemo, useState } from 'react'
import {
  Callout,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  SelectField,
  Toggle,
  type Segment,
} from '../../../design-system'
import {
  FinanceInputError,
  solveTvm,
  type TvmRegisters,
  type TvmVar,
} from '../../../lib/finance'
import { formatPercent, formatUSD } from '../../../lib/format'
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

/** The traditional five-key calculator: enter four, solve for the fifth. */
export function TvmCalculator() {
  const [n, setN] = useState(360)
  const [iy, setIy] = useState(6)
  const [pv, setPv] = useState(200_000)
  const [pmt, setPmt] = useState(0)
  const [fv, setFv] = useState(0)
  const [py, setPy] = useState(12)
  // 'Custom…' keeps P/Y freely adjustable; the presets cover daily → annually.
  const [customPy, setCustomPy] = useState(false)
  const [due, setDue] = useState(false)
  const [solveFor, setSolveFor] = useState<TvmVar>('pmt')

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
      <SegmentedControl label="Solve for" options={SOLVE_OPTIONS} value={solveFor} onChange={setSolveFor} />

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

      <FormulaBlock
        tex={`PV\\,(1+i)^{N} + PMT\\,\\dfrac{(1+i)^{N}-1}{i}\\,d + FV = 0`}
        caption="The equation every financial calculator solves · i = (I/Y ÷ P/Y) ÷ 100, d = (1+i) in begin mode"
      />
    </div>
  )
}
