import { FormulaBlock } from '../../../design-system'
import type { TvmResults } from '../compute'
import type { TvmState } from '../state'

function tex(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

export function TvmMath({ state, results }: { state: TvmState; results: TvmResults }) {
  const i = results.periodRate
  const n = results.periods
  const isLoan = results.mode === 'loan'

  // At a 0% rate the annuity formula is 0/0; the payment is simply the amount
  // split evenly across the months, and the formula shown must say so.
  const zeroRate = i === 0

  const general = zeroRate
    ? `PMT = \\dfrac{${isLoan ? 'P' : 'FV'}}{n}`
    : isLoan
      ? `PMT = \\dfrac{P \\cdot i}{1 - (1 + i)^{-n}}`
      : `PMT = \\dfrac{FV \\cdot i}{(1 + i)^{n} - 1}`

  const intro = isLoan
    ? 'Monthly loan payment'
    : 'Monthly amount you must save to reach the goal'

  const substituted = zeroRate
    ? `PMT = \\dfrac{${tex(state.amount, 0)}}{${n}}`
    : isLoan
      ? `PMT = \\dfrac{${tex(state.amount, 0)} \\cdot ${tex(i, 6)}}{1 - (1 + ${tex(i, 6)})^{-${n}}}`
      : `PMT = \\dfrac{${tex(state.amount, 0)} \\cdot ${tex(i, 6)}}{(1 + ${tex(i, 6)})^{${n}} - 1}`

  const evaluated = `PMT = \\boxed{${tex(results.payment)}}\\ \\text{per month}`

  const note = isLoan
    ? `Over ${n} payments you pay ${plain(results.totalPaid)} in total; ${plain(
        results.totalInterest,
      )} of that is interest.`
    : `You contribute ${plain(results.totalPaid)} of your own money; the other ${plain(
        results.totalInterest,
      )} comes from interest.`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FormulaBlock
        tex={general}
        caption={
          zeroRate
            ? `${intro} · at a 0% rate the amount divides evenly across the n months`
            : `${intro} · i is the monthly rate, n the number of months`
        }
      />
      <FormulaBlock tex={substituted} muted />
      <FormulaBlock tex={evaluated} muted />
      <p
        style={{
          fontSize: 'var(--fs-ui)',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 'var(--space-4)',
        }}
      >
        {note}
      </p>
    </div>
  )
}

function plain(v: number): string {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
