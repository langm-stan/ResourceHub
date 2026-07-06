import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole, formatYears } from '../../lib/format'
import { computeResults, type Results } from './compute'
import { parseScenario, scenariosEqual, toSearchParams, type Scenario } from './state'
import { PRESETS } from './presets'
import { ParameterPanel } from './components/ParameterPanel'
import { GrowthChart } from './components/GrowthChart'
import { MathReport } from './components/MathReport'
import { FrequencyExplorer } from './components/FrequencyExplorer'
import { CompareView } from './components/CompareView'
import styles from './CompoundInterestPage.module.css'

type Surface = 'overview' | 'breakdown' | 'math' | 'experiment' | 'frequency'

const FV_TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Watch it grow' },
  { value: 'breakdown', label: 'The breakdown' },
  { value: 'math', label: 'The math' },
  { value: 'experiment', label: 'Experiment' },
  { value: 'frequency', label: 'Frequency' },
]

const PV_TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Worth today' },
  { value: 'math', label: 'The math' },
]

export function CompoundInterestPage() {
  const [params, setParams] = useSearchParams()
  const [surface, setSurface] = useState<Surface>('overview')
  const [copied, setCopied] = useState(false)

  const scenario = useMemo(() => parseScenario(params), [params])
  const results = useMemo(() => computeResults(scenario), [scenario])

  const update = useCallback(
    (patch: Partial<Scenario>) => {
      const next = { ...scenario, ...patch }
      const nextParams = toSearchParams(next)
      if (params.get('embed') === '1') nextParams.set('embed', '1')
      // Keep the Calculators page on this tool; without it the page falls
      // back to its default tool on every input change.
      const tool = params.get('tool')
      if (tool) nextParams.set('tool', tool)
      setParams(nextParams, { replace: true })
    },
    [scenario, params, setParams],
  )

  const loadPreset = useCallback(
    (s: Scenario) => {
      const nextParams = toSearchParams(s)
      if (params.get('embed') === '1') nextParams.set('embed', '1')
      const tool = params.get('tool')
      if (tool) nextParams.set('tool', tool)
      setParams(nextParams, { replace: true })
      setSurface('overview')
    },
    [params, setParams],
  )

  const share = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }, [])

  const isPv = scenario.mode === 'pv'
  const tabs = isPv ? PV_TABS : FV_TABS
  const active = tabs.some((t) => t.value === surface) ? surface : 'overview'

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Compound interest</p>
        <h1 className={styles.h1}>See how money grows over time</h1>
        <p className={styles.lead}>
          Money that earns interest doesn&rsquo;t grow in a straight line. It speeds up, because
          the interest starts earning interest of its own. Start from an example or set your own
          numbers, then use the tabs to explore.
        </p>
      </header>

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Examples</span>
        <div className={styles.examplePills}>
          {PRESETS.map((preset) => {
            const isActive = scenariosEqual(scenario, preset.scenario)
            return (
              <button
                key={preset.id}
                type="button"
                className={
                  isActive ? `${styles.examplePill} ${styles.examplePillActive}` : styles.examplePill
                }
                onClick={() => loadPreset(preset.scenario)}
                title={preset.caption}
              >
                {preset.title}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.rail}>
          <div className={styles.railSticky}>
            <StepHeader title="Set up your scenario" />
            <ParameterPanel scenario={scenario} onChange={update} />
            <div className={styles.shareRow}>
              <Button variant="quiet" size="sm" onClick={share}>
                {copied ? 'Link copied ✓' : 'Copy a link to this scenario'}
              </Button>
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.tabBar}>
            <Tabs items={tabs} value={active} onChange={setSurface} />
          </div>

          <Card tone="raised" className={styles.panel}>
            {active === 'overview' && <OverviewPanel scenario={scenario} results={results} />}
            {active === 'breakdown' && <BreakdownPanel results={results} />}
            {active === 'math' && (
              <>
                <StepHeader
                  title="See the math"
                  hint="The formula behind the chart, with your numbers filled in."
                />
                <MathReport scenario={scenario} results={results} />
              </>
            )}
            {active === 'experiment' && (
              <>
                <StepHeader
                  title="Experiment"
                  hint="What matters more: saving more, a higher rate, or waiting longer? Turn one knob at a time and compare."
                />
                <CompareView scenario={scenario} />
              </>
            )}
            {active === 'frequency' && (
              <>
                <StepHeader
                  title="Does compounding more often matter?"
                  hint="Daily instead of yearly? See how much it really changes."
                />
                <FrequencyExplorer scenario={scenario} />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function OverviewPanel({ scenario, results }: { scenario: Scenario; results: Results }) {
  const isPv = scenario.mode === 'pv'
  if (isPv) {
    const pct =
      results.futureAmount > 0 ? formatPercent(results.headline / results.futureAmount, 1) : '0%'
    const stats = (
      <div className={styles.stats}>
        <Stat
          label="Worth today"
          value={results.headline}
          format={formatUSDWhole}
          emphasis
          accentColor="var(--c-series-1)"
        />
        <Stat label="Promised later" value={results.futureAmount} format={formatUSDWhole} />
        <Stat
          label="Rate"
          value={results.ear}
          format={(v) => formatPercent(v, 2)}
          animate={false}
        />
      </div>
    )
    return (
      <>
        <StepHeader
          title="What is it worth today?"
          hint="Compounding in reverse: money promised in the future is worth less right now."
        />
        {stats}
        <GrowthChart scenario={scenario} results={results} overlayHeader={stats} />
        <p className={styles.takeaway}>
          {formatUSDWhole(results.futureAmount)} promised in {scenario.years} years is worth only{' '}
          <strong>{formatUSDWhole(results.headline)}</strong> today, about {pct} of the future
          amount. Distance in time is expensive.
        </p>
      </>
    )
  }

  const stats = (
    <div className={styles.stats}>
      <Stat
        label="Ends at"
        value={results.final.balance}
        format={formatUSDWhole}
        emphasis
        accentColor="var(--c-series-1)"
      />
      <Stat label="You put in" value={results.totalContributed} format={formatUSDWhole} />
      <Stat
        label="Interest earned"
        value={results.totalInterest}
        format={formatUSDWhole}
        accentColor="var(--c-series-2)"
      />
    </div>
  )
  return (
    <>
      <StepHeader
        title="Watch it grow"
        hint="The line is your balance over time. Notice how it curves upward. That's the speeding-up."
      />
      {stats}
      <GrowthChart scenario={scenario} results={results} overlayHeader={stats} />
      <p className={styles.takeaway}>
        Your {formatUSDWhole(scenario.principal)} becomes{' '}
        <strong>{formatUSDWhole(results.final.balance)}</strong> after {scenario.years} years. You
        contributed {formatUSDWhole(results.totalContributed)} and earned{' '}
        {formatUSDWhole(results.totalInterest)} in interest
        {results.doublingYears
          ? `, doubling about every ${formatYears(results.doublingYears)}.`
          : '.'}
      </p>
    </>
  )
}

function BreakdownPanel({ results }: { results: Results }) {
  const ioiPct =
    results.totalInterest > 0
      ? Math.round((results.interestOnInterest / results.totalInterest) * 100)
      : 0
  return (
    <>
      <StepHeader
        title="Where does the growth come from?"
        hint="Your final balance is made of three parts. The third one is the surprising one."
      />
      <ul className={styles.parts}>
        <li>
          <span className={styles.swatch} style={{ background: 'var(--c-series-3)' }} />
          <span>
            <strong>Your money</strong>: {formatUSDWhole(results.totalContributed)} that you put in.
          </span>
        </li>
        <li>
          <span className={styles.swatch} style={{ background: 'var(--c-series-2)' }} />
          <span>
            <strong>Simple interest</strong>: {formatUSDWhole(results.final.simpleInterest)}, what
            your deposits would earn if interest never compounded.
          </span>
        </li>
        <li>
          <span className={styles.swatch} style={{ background: 'var(--c-series-1)' }} />
          <span>
            <strong>Interest on interest</strong>: {formatUSDWhole(results.interestOnInterest)},
            earned by the interest itself. This is compounding.
          </span>
        </li>
      </ul>
      <Callout tone="note" label="The big idea">
        About <strong>{ioiPct}%</strong> of all the interest here came from interest earning more
        interest: money that only exists because earlier interest kept working. The longer you
        wait, the more this part takes over.
      </Callout>
    </>
  )
}
