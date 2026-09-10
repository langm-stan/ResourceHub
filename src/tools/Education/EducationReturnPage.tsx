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
import { evaluateEducation, npvByRaise, npvByRate, type CostTiming, type EducationInputs } from './compute'
import { CashFlowChart } from './components/CashFlowChart'
import styles from './EducationPage.module.css'

/*
 * The return on education. A degree is a project like any other: it costs
 * money now and pays money later, so both are moved to today and compared.
 * The cost is tuition plus the income given up while studying, which is the
 * term people leave out, and the benefit is the raise, every year it is
 * earned. The page also solves for the raise that makes the two equal.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'

type Surface = 'flows' | 'raise' | 'rate' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'flows', label: 'The cash flows' },
  { value: 'raise', label: 'A smaller raise' },
  { value: 'rate', label: 'A different rate' },
  { value: 'math', label: 'The math' },
]

interface Preset {
  id: string
  label: string
  inputs: EducationInputs
}

const PRESETS: Preset[] = [
  {
    id: 'masters',
    label: "A one-year master's",
    inputs: {
      programYears: 1,
      tuitionPerYear: 75000,
      forgonePerYear: 50000,
      raisePerYear: 20000,
      yearsEarning: 40,
      ratePct: 8,
      costTiming: 'start',
    },
  },
  {
    id: 'small-raise',
    label: 'The same degree, a $10,000 raise',
    inputs: {
      programYears: 1,
      tuitionPerYear: 75000,
      forgonePerYear: 50000,
      raisePerYear: 10000,
      yearsEarning: 40,
      ratePct: 8,
      costTiming: 'start',
    },
  },
  {
    id: 'carlos',
    label: 'Back to school at 50, still working',
    inputs: {
      programYears: 2,
      tuitionPerYear: 31000,
      forgonePerYear: 0,
      raisePerYear: 10000,
      yearsEarning: 13,
      ratePct: 7,
      costTiming: 'end',
    },
  },
]

const TIMING: { value: CostTiming; label: string }[] = [
  { value: 'start', label: 'Start of year' },
  { value: 'end', label: 'End of year' },
]

export function EducationReturnPage({ intro = true }: { intro?: boolean } = {}) {
  const [inputs, setInputs] = useState<EducationInputs>(PRESETS[0]!.inputs)
  const [active, setActive] = useState<Surface>('flows')
  const set = (patch: Partial<EducationInputs>) => setInputs((prev) => ({ ...prev, ...patch }))

  const result = useMemo(() => evaluateEducation(inputs), [inputs])
  const worthIt = result.npv >= 0
  const currentPreset = PRESETS.find(
    (p) => JSON.stringify(p.inputs) === JSON.stringify(inputs)
  )?.id

  // The sensitivity sweeps run from zero to twice the current setting, so the
  // reader's own case sits in the middle of each chart.
  const raises = useMemo(
    () => Array.from({ length: 61 }, (_, i) => (i * Math.max(inputs.raisePerYear, 5000) * 2) / 60),
    [inputs.raisePerYear]
  )
  const raiseNpvs = useMemo(() => npvByRaise(inputs, raises), [inputs, raises])
  const rates = useMemo(() => Array.from({ length: 61 }, (_, i) => (i * 20) / 60), [])
  const rateNpvs = useMemo(() => npvByRate(inputs, rates), [inputs, rates])

  const sweepMin = Math.min(0, ...raiseNpvs, ...rateNpvs)
  const raiseMax = Math.max(...raiseNpvs, 0)
  const rateMax = Math.max(...rateNpvs, 0)

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson &middot; Investing in education</p>
          <h1 className={styles.h1}>The Return on Education</h1>
          <p className={styles.lead}>
            Tuition and the income given up while studying, set against the raise the degree
            earns.
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
              label="Years in the program"
              value={inputs.programYears}
              onChange={(programYears) => set({ programYears })}
              min={1}
              max={8}
              step={1}
              editable
              suffix="years"
            />
            <Slider
              label="Tuition, fees and books"
              value={inputs.tuitionPerYear}
              onChange={(tuitionPerYear) => set({ tuitionPerYear })}
              min={0}
              max={100000}
              step={1000}
              editable
              inputMax={500000}
              prefix="$"
              note="For one year of the program."
            />
            <Slider
              label="Income given up each year"
              value={inputs.forgonePerYear}
              onChange={(forgonePerYear) => set({ forgonePerYear })}
              min={0}
              max={150000}
              step={1000}
              editable
              inputMax={1000000}
              prefix="$"
              note="Zero if you keep working while you study."
            />
            <Slider
              label="Raise once you finish"
              value={inputs.raisePerYear}
              onChange={(raisePerYear) => set({ raisePerYear })}
              min={0}
              max={100000}
              step={1000}
              editable
              inputMax={500000}
              prefix="$"
              note="Extra income per year, not the whole salary."
            />
            <Slider
              label="Years earning the raise"
              value={inputs.yearsEarning}
              onChange={(yearsEarning) => set({ yearsEarning })}
              min={1}
              max={45}
              step={1}
              editable
              suffix="years"
              note="Normally the years left until you retire."
            />
            <Slider
              label="Discount rate"
              value={inputs.ratePct}
              onChange={(ratePct) => set({ ratePct })}
              min={0}
              max={20}
              step={0.5}
              editable
              inputMax={40}
              suffix="%"
              precision={1}
              note="What the money could earn elsewhere."
            />
            <div className={styles.controlsSplit}>
              <SegmentedControl
                label="Tuition is paid at the"
                options={TIMING}
                value={inputs.costTiming}
                onChange={(costTiming) => set({ costTiming })}
              />
            </div>
          </div>
        </Card>

        <div className={styles.stats}>
          <Stat
            label="Cost, in today's money"
            value={result.pvCosts}
            format={formatUSDWhole}
            accentColor={RED}
          />
          <Stat
            label="The raise, in today's money"
            value={result.pvBenefits}
            format={formatUSDWhole}
            accentColor={GREEN}
          />
          <Stat
            label="Net present value"
            value={result.npv}
            format={formatUSDWhole}
            emphasis
            accentColor={worthIt ? GREEN : RED}
            note={worthIt ? 'benefit above cost' : 'benefit below cost'}
          />
          <Stat
            label="Return on the money spent"
            value={result.irr ?? 0}
            format={(v) => (result.irr == null ? 'n/a' : formatPercent(v, 2))}
            note={result.irr == null ? 'not defined for these numbers' : 'where benefit equals cost'}
          />
        </div>

        <Callout tone={worthIt ? 'note' : 'mark'} label="The break-even raise">
          At {formatPercent(inputs.ratePct / 100, 1)}, a raise of{' '}
          <strong>{formatUSDWhole(result.breakEvenRaise)}</strong> a year for{' '}
          {inputs.yearsEarning} years has a present value of {formatUSDWhole(result.pvCosts)}, the
          same as the cost. This example uses a raise of {formatUSDWhole(inputs.raisePerYear)}.
        </Callout>

        <div className={styles.tabRow}>
          <Tabs items={TABS} value={active} onChange={setActive} />
        </div>

        <Card tone="raised" className={styles.panel}>
          {active === 'flows' && (
            <>
              <p className={styles.legend}>
                <span style={{ color: RED }}>&#9632; tuition and income given up</span>
                <span style={{ color: GREEN }}>&#9632; the raise</span>
              </p>
              <CashFlowChart
                flows={result.flows}
                ariaLabel="The cost and the raise, year by year"
                caption={`${inputs.programYears === 1 ? 'One year' : `${inputs.programYears} years`} of ${formatUSDWhole(result.costPerYear)} against ${inputs.yearsEarning} years of ${formatUSDWhole(inputs.raisePerYear)}, in the year each amount occurs.`}
              />
              <p className={styles.note}>
                The bars show the amounts in the year they occur. The figures above show them
                discounted to today.
              </p>
            </>
          )}

          {active === 'raise' && (
            <>
              <StationChart
                x={raises}
                lines={[{ ys: raiseNpvs, color: GREEN, width: 2, label: 'Net present value' }]}
                yMin={sweepMin}
                yMax={raiseMax * 1.1 || 1}
                yRef={0}
                refLabel="breaks even"
                xRef={result.breakEvenRaise}
                xRefLabel={`${formatUSDWhole(result.breakEvenRaise)} breaks even`}
                xTickFormat={(v) => formatUSDWhole(v)}
                xHoverLabel={(v: number) => `A raise of ${formatUSDWhole(v)}`}
                ariaLabel="Net present value against the size of the raise"
                caption={`Net present value as the raise changes. The line crosses zero at ${formatUSDWhole(result.breakEvenRaise)} a year.`}
              />
              <p className={styles.note}>
                The raise is multiplied by the present value of one dollar a year for{' '}
                {inputs.yearsEarning} years, so the line is straight.
              </p>
            </>
          )}

          {active === 'rate' && (
            <>
              <StationChart
                x={rates}
                lines={[{ ys: rateNpvs, color: GREEN, width: 2, label: 'Net present value' }]}
                yMin={sweepMin}
                yMax={rateMax * 1.1 || 1}
                yRef={0}
                refLabel="breaks even"
                xRef={result.irr != null ? result.irr * 100 : undefined}
                xRefLabel={result.irr != null ? `${formatPercent(result.irr, 1)} return` : undefined}
                xTickFormat={(v) => `${v.toFixed(0)}%`}
                xHoverLabel={(v: number) => `At a rate of ${v.toFixed(1)}%`}
                ariaLabel="Net present value against the discount rate"
                caption={`Net present value as the discount rate changes. ${result.irr != null ? `The line crosses zero at ${formatPercent(result.irr, 2)}.` : 'The line does not cross zero over this range.'}`}
              />
              <p className={styles.note}>
                A higher rate reduces the present value of the raise more than it reduces the cost,
                which falls at the start.
              </p>
            </>
          )}

          {active === 'math' && (
            <MathSection
              title="The math"
              hint="Each amount is discounted to today, then the two sides are compared."
              rows={[
                {
                  tex: String.raw`PV = \sum_{t} \frac{C_t}{(1+r)^t}`,
                  caption: 'The present value of a stream of amounts at rate r.',
                },
                {
                  tex: String.raw`PV_{\text{cost}} = ${texNumber(inputs.programYears)} \times \frac{${texUSD(result.costPerYear)}}{(1+${texNumber(inputs.ratePct / 100, 4)})^t} = \boxed{${texUSD(result.pvCosts)}}`,
                  caption: `Tuition of ${formatUSDWhole(inputs.tuitionPerYear)} plus ${formatUSDWhole(inputs.forgonePerYear)} of income given up, each year of the program.`,
                  muted: true,
                },
                {
                  tex: String.raw`PV_{\text{raise}} = ${texUSD(inputs.raisePerYear)} \times ${texNumber(result.raiseFactor, 4)} = \boxed{${texUSD(result.pvBenefits)}}`,
                  caption: `A dollar a year for ${inputs.yearsEarning} years, starting once the program ends, is worth ${texNumber(result.raiseFactor, 4)} today.`,
                  muted: true,
                },
                {
                  tex: String.raw`NPV = ${texUSD(result.pvBenefits)} - ${texUSD(result.pvCosts)} = \boxed{${texUSD(result.npv)}}`,
                  caption: 'The benefit less the cost, both in today’s money.',
                  muted: true,
                },
                {
                  tex: String.raw`\text{break-even raise} = \frac{${texUSD(result.pvCosts)}}{${texNumber(result.raiseFactor, 4)}} = \boxed{${texUSD(result.breakEvenRaise)}}`,
                  caption: 'The raise at which the two sides are equal.',
                  muted: true,
                },
              ]}
              note={
                worthIt
                  ? 'The present value of the raise is above the cost, so the degree pays for itself on these numbers.'
                  : 'The present value of the raise is below the cost, so the degree does not pay for itself on these numbers.'
              }
            >
              <Callout tone="note" label="The two parts of the cost">
                The cost of a full-time program is tuition plus the income given up while studying.
                Set the income given up to zero if you keep earning.
              </Callout>
            </MathSection>
          )}
        </Card>
      </div>
    </div>
  )
}
