import { SegmentedControl, Slider, type Segment } from '../../../design-system'
import type { TvmMode, TvmState } from '../state'

const MODE_OPTIONS: Segment<TvmMode>[] = [
  { value: 'loan', label: 'Borrow' },
  { value: 'save', label: 'Save' },
]

export function TvmParameters({
  state,
  onChange,
}: {
  state: TvmState
  onChange: (patch: Partial<TvmState>) => void
}) {
  const isLoan = state.mode === 'loan'

  return (
    // One compact row: every number is a slider with a typed input beside it.
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4) var(--space-5)',
        alignItems: 'start',
      }}
    >
      <SegmentedControl
        label="What are you working out?"
        options={MODE_OPTIONS}
        value={state.mode}
        onChange={(mode) =>
          onChange({ mode, years: mode === 'loan' ? Math.min(state.years, 30) : state.years })
        }
      />
      <Slider
        label={isLoan ? 'Loan amount' : 'Goal amount'}
        value={state.amount}
        onChange={(amount) => onChange({ amount })}
        min={0}
        max={isLoan ? 500_000 : 200_000}
        step={1000}
        editable
        inputMax={2_000_000}
        prefix="$"
      />
      <Slider
        label="Annual interest rate"
        value={state.ratePct}
        onChange={(ratePct) => onChange({ ratePct })}
        min={0}
        max={30}
        step={0.25}
        editable
        inputMax={40}
        suffix="%"
        precision={2}
      />
      <Slider
        label={isLoan ? 'Loan term' : 'Time to save'}
        value={state.years}
        onChange={(years) => onChange({ years })}
        min={1}
        max={isLoan ? 30 : 40}
        step={1}
        editable
        inputMax={isLoan ? 50 : 80}
        suffix={state.years === 1 ? 'year' : 'years'}
        note="Payments are monthly."
      />
    </div>
  )
}
