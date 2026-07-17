import { NumberField, SegmentedControl, Slider, type Segment } from '../../../design-system'
import { formatUSDWhole } from '../../../lib/format'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <SegmentedControl
        label="What are you working out?"
        options={MODE_OPTIONS}
        value={state.mode}
        onChange={(mode) =>
          onChange({ mode, years: mode === 'loan' ? Math.min(state.years, 30) : state.years })
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <NumberField
          label={isLoan ? 'Loan amount' : 'Goal amount'}
          value={state.amount}
          onChange={(amount) => onChange({ amount })}
          min={0}
          max={2_000_000}
          prefix="$"
          precision={0}
        />
        <Slider
          label=""
          value={Math.min(state.amount, isLoan ? 500_000 : 200_000)}
          onChange={(amount) => onChange({ amount })}
          min={0}
          max={isLoan ? 500_000 : 200_000}
          step={1000}
          readout={formatUSDWhole(state.amount)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <NumberField
          label="Annual interest rate"
          value={state.ratePct}
          onChange={(ratePct) => onChange({ ratePct })}
          min={0}
          max={40}
          suffix="%"
          precision={2}
        />
        <Slider
          label=""
          value={Math.min(state.ratePct, 30)}
          onChange={(ratePct) => onChange({ ratePct })}
          min={0}
          max={30}
          step={0.25}
          readout={`${state.ratePct}%`}
        />
      </div>

      <Slider
        label={isLoan ? 'Loan term' : 'Time to save'}
        value={Math.min(state.years, isLoan ? 30 : 40)}
        onChange={(years) => onChange({ years })}
        min={1}
        max={isLoan ? 30 : 40}
        step={1}
        readout={`${state.years} ${state.years === 1 ? 'year' : 'years'}`}
        note="Payments are monthly."
      />
    </div>
  )
}
