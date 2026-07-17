import {
  NumberField,
  SegmentedControl,
  Slider,
  Toggle,
  type Segment,
} from '../../../design-system'
import { effectiveAnnualRate, FREQUENCIES, type FrequencyName } from '../../../lib/finance'
import { formatPercent, formatUSDWhole } from '../../../lib/format'
import type { Mode, Scenario } from '../state'
import styles from './ParameterPanel.module.css'

const FREQ_OPTIONS: Segment<FrequencyName>[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'semiannual', label: 'Semi' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
  { value: 'continuous', label: 'Continuous' },
]

const MODE_OPTIONS: Segment<Mode>[] = [
  { value: 'fv', label: 'Future value' },
  { value: 'pv', label: 'Present value' },
]

interface ParameterPanelProps {
  scenario: Scenario
  onChange: (patch: Partial<Scenario>) => void
}

export function ParameterPanel({ scenario, onChange }: ParameterPanelProps) {
  const rate = scenario.ratePct / 100
  const ear = effectiveAnnualRate(rate, FREQUENCIES[scenario.frequency])
  const earNote =
    scenario.frequency === 'annual'
      ? 'Compounded once a year.'
      : `${formatPercent(rate, 1)} compounded ${scenario.frequency} = ${formatPercent(ear, 2)} effective.`

  const isPv = scenario.mode === 'pv'

  return (
    <div className={styles.panel}>
      <SegmentedControl
        label="Solve for"
        options={MODE_OPTIONS}
        value={scenario.mode}
        onChange={(mode) =>
          onChange({ mode, contribution: mode === 'pv' ? null : scenario.contribution })
        }
      />

      <div className={styles.group}>
        <NumberField
          label={isPv ? 'Future amount' : 'Initial amount'}
          value={scenario.principal}
          onChange={(principal) => onChange({ principal })}
          min={0}
          max={1_000_000}
          prefix="$"
          precision={0}
        />
        <Slider
          label=""
          value={Math.min(scenario.principal, 100_000)}
          onChange={(principal) => onChange({ principal })}
          min={0}
          max={100_000}
          step={500}
          readout={formatUSDWhole(scenario.principal)}
        />
      </div>

      <div className={styles.group}>
        <NumberField
          label="Annual rate"
          value={scenario.ratePct}
          onChange={(ratePct) => onChange({ ratePct })}
          min={0}
          max={40}
          suffix="%"
          precision={1}
        />
        <Slider
          label=""
          value={Math.min(scenario.ratePct, 20)}
          onChange={(ratePct) => onChange({ ratePct })}
          min={0}
          max={20}
          step={0.1}
          readout={`${scenario.ratePct}%`}
          note={earNote}
        />
      </div>

      <div className={styles.group}>
        <NumberField
          label={isPv ? 'Time until paid' : 'Time horizon'}
          value={scenario.years}
          onChange={(years) => onChange({ years })}
          min={1}
          max={100}
          suffix="years"
          precision={0}
        />
        <Slider
          label=""
          value={Math.min(scenario.years, 60)}
          onChange={(years) => onChange({ years })}
          min={1}
          max={60}
          step={1}
          readout={`${scenario.years} years`}
        />
      </div>

      <SegmentedControl
        label="Compounding"
        options={FREQ_OPTIONS}
        value={scenario.frequency}
        onChange={(frequency) => onChange({ frequency })}
      />

      {!isPv && (
        <div className={styles.contrib}>
          <Toggle
            label="Add regular contributions"
            note={
              scenario.frequency === 'continuous'
                ? 'A fixed amount invested every month. Under continuous compounding, contributions are still made monthly.'
                : 'A fixed amount invested every compounding period.'
            }
            checked={scenario.contribution != null}
            onChange={(on) =>
              onChange({
                contribution: on ? { amount: 200, timing: 'ordinary' } : null,
              })
            }
          />
          {scenario.contribution && (
            <div className={styles.contribFields}>
              <NumberField
                label={scenario.frequency === 'continuous' ? 'Each month' : 'Each period'}
                value={scenario.contribution.amount}
                onChange={(amount) =>
                  onChange({ contribution: { ...scenario.contribution!, amount } })
                }
                min={0}
                max={10_000}
                prefix="$"
                precision={0}
              />
              <SegmentedControl
                label="Timing"
                options={[
                  { value: 'ordinary', label: 'End of period' },
                  { value: 'due', label: 'Start of period' },
                ]}
                value={scenario.contribution.timing}
                onChange={(timing) =>
                  onChange({ contribution: { ...scenario.contribution!, timing } })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
