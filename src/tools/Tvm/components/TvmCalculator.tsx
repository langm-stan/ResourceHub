import { useState } from 'react'
import {
  Button,
  Callout,
  MathSection,
  NumberField,
  SelectField,
  Toggle,
  type MathRow,
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

/** Row order follows the familiar EZ-calculator layout: cash flows first, then rate and periods. */
const KEY_ROWS: { var: TvmVar; key: string; label: string; help: string }[] = [
  { var: 'pv', key: 'PV', label: 'Present value', help: 'Value today' },
  { var: 'pmt', key: 'PMT', label: 'Payment', help: 'Cash flow each period' },
  { var: 'fv', key: 'FV', label: 'Future value', help: 'Value at the end' },
  { var: 'iy', key: 'I/Y', label: 'Annual rate', help: 'Interest per year (%)' },
  { var: 'n', key: 'N', label: 'Number of periods', help: 'Total number of payments' },
]

const MONEY_VARS: TvmVar[] = ['pv', 'pmt', 'fv']

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
const DEFAULTS = { n: 360, iy: 8, pv: 0, pmt: -100, fv: 0, py: 12, due: false }

/** One saved solve: the full register snapshot plus which key was computed. */
interface SavedStep {
  solveFor: TvmVar
  value: number
  n: number
  iy: number
  pv: number
  pmt: number
  fv: number
  py: number
  due: boolean
}

function isValidSaved(list: SavedStep[]): boolean {
  return (
    Array.isArray(list) &&
    list.every(
      (s) =>
        s != null &&
        typeof s === 'object' &&
        KEY_ROWS.some((k) => k.var === s.solveFor) &&
        typeof s.due === 'boolean' &&
        (['value', 'n', 'iy', 'pv', 'pmt', 'fv', 'py'] as const).every((f) =>
          Number.isFinite(s[f]),
        ),
    )
  )
}

/**
 * The traditional five-key calculator, laid out like the EZ financial
 * calculator: one row per register with its own solve key. Fill in the four
 * you know and press the key for the fifth; the answer drops into its box.
 */
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
  const [saved, setSaved] = usePersistentState<SavedStep[]>('ifdm-tvm-calc-saved', [], isValidSaved)

  // Which key was pressed last, and the message if that solve failed. Editing
  // any register clears both, so a stale answer never sits next to new inputs.
  const [lastSolved, setLastSolved] = useState<TvmVar | null>(null)
  const [solveError, setSolveError] = useState<string | null>(null)

  const registers: TvmRegisters = { n, iy, pv, pmt, fv, py, due }

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

  function clearAnswer() {
    setLastSolved(null)
    setSolveError(null)
  }

  function editRegister(v: TvmVar): (x: number) => void {
    const set = setterFor(v)
    return (x) => {
      set(x)
      clearAnswer()
    }
  }

  function solve(v: TvmVar) {
    try {
      const value = solveTvm(registers, v)
      setterFor(v)(value)
      setLastSolved(v)
      setSolveError(null)
    } catch (e) {
      const msg = e instanceof FinanceInputError ? e.message : 'These values have no solution.'
      setLastSolved(null)
      setSolveError(msg)
    }
  }

  function reset() {
    setN(DEFAULTS.n)
    setIy(DEFAULTS.iy)
    setPv(DEFAULTS.pv)
    setPmt(DEFAULTS.pmt)
    setFv(DEFAULTS.fv)
    setPy(DEFAULTS.py)
    setCustomPy(false)
    setDue(DEFAULTS.due)
    clearAnswer()
  }

  function saveResult() {
    if (lastSolved == null) return
    setSaved((prev) => [
      ...prev,
      { solveFor: lastSolved, value: valueFor(lastSolved), n, iy, pv, pmt, fv, py, due },
    ])
  }

  function insertValue(target: TvmVar, value: number) {
    setterFor(target)(value)
    clearAnswer()
  }

  function restoreStep(s: SavedStep) {
    setN(s.n)
    setIy(s.iy)
    setPv(s.pv)
    setPmt(s.pmt)
    setFv(s.fv)
    setPy(s.py)
    setCustomPy(!FREQUENCY_VALUES.includes(String(s.py)))
    setDue(s.due)
    setLastSolved(s.solveFor)
    setSolveError(null)
  }

  const frequencyValue = customPy || !FREQUENCY_VALUES.includes(String(py)) ? 'custom' : String(py)
  const pickFrequency = (v: string) => {
    if (v === 'custom') {
      setCustomPy(true)
    } else {
      setCustomPy(false)
      setPy(Number(v))
    }
    clearAnswer()
  }

  function displayValue(v: TvmVar, x: number): string {
    if (!Number.isFinite(x)) return '–'
    if (v === 'iy') return formatPercent(x / 100, 3)
    if (v === 'n') return `${Math.round(x * 100) / 100}`
    return formatUSD(x)
  }

  const answerRow = lastSolved != null ? KEY_ROWS.find((k) => k.var === lastSolved)! : null

  function stepSummary(s: SavedStep): string {
    const givens = KEY_ROWS.filter((k) => k.var !== s.solveFor)
      .map((k) => `${k.key} ${displayValue(k.var, s[k.var])}`)
      .join(' · ')
    return `${givens} · ${s.py}/yr${s.due ? ' · begin' : ''}`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.rows}>
        {KEY_ROWS.map((k) => {
          const isSolved = lastSolved === k.var
          return (
            <div key={k.var} className={isSolved ? `${styles.row} ${styles.rowSolved}` : styles.row}>
              <div className={styles.rowLabels}>
                <span className={styles.key}>
                  {k.label} <span className={styles.keyCode}>({k.key})</span>
                </span>
                <span className={styles.keyHelp}>{k.help}</span>
              </div>
              <NumberField
                value={valueFor(k.var)}
                onChange={editRegister(k.var)}
                ariaLabel={`${k.label} (${k.key})`}
                prefix={MONEY_VARS.includes(k.var) ? '$' : undefined}
                suffix={k.var === 'iy' ? '%' : undefined}
                precision={k.var === 'iy' ? 3 : 2}
              />
              <Button
                className={styles.keyBtn}
                onClick={() => solve(k.var)}
                aria-label={`Solve for ${k.label}`}
              >
                {k.key}
              </Button>
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
            onChange={(v) => {
              setPy(Math.max(1, Math.round(v)))
              clearAnswer()
            }}
            min={1}
            max={365}
            precision={0}
          />
        )}
        <div className={styles.timing}>
          <Toggle
            label="Payments at the beginning (annuity due)"
            checked={due}
            onChange={(v) => {
              setDue(v)
              clearAnswer()
            }}
          />
        </div>
        <div className={styles.resetSlot}>
          <Button variant="quiet" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {solveError != null && (
        <Callout tone="mark" label="No solution">
          {solveError}
        </Callout>
      )}

      {answerRow != null && (
        <div className={styles.answerBar}>
          <div className={styles.answerText}>
            <span className={styles.answerLine}>
              <span className={styles.answerKey}>{answerRow.key}</span> ={' '}
              <span className={`${styles.answerValue} tnum`}>
                {displayValue(answerRow.var, valueFor(answerRow.var))}
              </span>
            </span>
            <span className={styles.answerNote}>
              Money you receive is positive; money you pay out is negative.
            </span>
          </div>
          <Button size="sm" onClick={saveResult}>
            Save result
          </Button>
        </div>
      )}

      {saved.length > 0 && (
        <div className={styles.saved}>
          <div className={styles.savedHead}>
            <span className={styles.savedTitle}>Saved results</span>
            <span className={styles.savedHint}>
              For a two- or three-step problem, save each answer and carry it into the next step.
            </span>
            <Button variant="link" size="sm" onClick={() => setSaved([])}>
              Clear all
            </Button>
          </div>
          <ol className={styles.savedList}>
            {saved.map((s, i) => {
              const keyRow = KEY_ROWS.find((k) => k.var === s.solveFor)!
              return (
                <li key={i} className={styles.savedRow}>
                  <div className={styles.savedMain}>
                    <span className={`${styles.savedAnswer} tnum`}>
                      {keyRow.key} = {displayValue(s.solveFor, s.value)}
                    </span>
                    <span className={`${styles.savedRegs} tnum`}>{stepSummary(s)}</span>
                  </div>
                  <div className={styles.savedActions}>
                    {MONEY_VARS.includes(s.solveFor) && (
                      <>
                        <Button variant="quiet" size="sm" onClick={() => insertValue('pv', s.value)}>
                          Use as PV
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => insertValue('fv', s.value)}>
                          Use as FV
                        </Button>
                      </>
                    )}
                    <Button variant="quiet" size="sm" onClick={() => restoreStep(s)}>
                      Restore
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setSaved((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove saved result ${i + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <MathSection
        hint="The one equation every financial calculator solves, with your registers substituted in."
        rows={workedRows(
          registers,
          lastSolved ?? 'fv',
          lastSolved != null ? valueFor(lastSolved) : NaN,
          lastSolved == null,
        )}
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
