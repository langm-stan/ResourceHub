import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Callout, Card, Stat, StepHeader, Tabs, type TabItem } from '../../design-system'
import { formatPercent, formatUSDWhole, formatYears } from '../../lib/format'
import { computeTvm, type TvmResults } from './compute'
import { parseTvm, toSearchParams, tvmEqual, TVM_PRESETS, type TvmState } from './state'
import { TvmParameters } from './components/TvmParameters'
import { TvmChart } from './components/TvmChart'
import { ScheduleTable } from './components/ScheduleTable'
import { TvmMath } from './components/TvmMath'
import styles from './TvmPage.module.css'

type Surface = 'overview' | 'schedule' | 'math'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function TvmPage({ intro = true }: { intro?: boolean } = {}) {
  const [params, setParams] = useSearchParams()
  const [surface, setSurface] = useState<Surface>('overview')
  const [copied, setCopied] = useState(false)

  const state = useMemo(() => parseTvm(params), [params])

  const setState = useCallback(
    (next: TvmState) => {
      const p = toSearchParams(next)
      if (params.get('embed') === '1') p.set('embed', '1')
      const tool = params.get('tool')
      if (tool) p.set('tool', tool)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )
  const update = useCallback(
    (patch: Partial<TvmState>) => setState({ ...state, ...patch }),
    [state, setState],
  )

  const share = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }, [])

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Time value of money</p>
          <h1 className={styles.h1}>What does it cost, and what does it take?</h1>
          <p className={styles.lead}>
            A dollar today isn&rsquo;t the same as a dollar later. Work out the monthly payment on a
            loan, or how much to set aside each month to reach a savings goal. To solve for any value
            directly, use the five-key TVM Calculator in the sidebar.
          </p>
        </header>
      )}

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Examples</span>
        <div className={styles.examplePills}>
          {TVM_PRESETS.map((preset) => {
            const isActive = tvmEqual(state, preset.state)
            return (
              <button
                key={preset.id}
                type="button"
                className={
                  isActive ? `${styles.examplePill} ${styles.examplePillActive}` : styles.examplePill
                }
                onClick={() => {
                  setState(preset.state)
                  setSurface('overview')
                }}
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
            <TvmParameters state={state} onChange={update} />
            <div className={styles.shareRow}>
              <Button variant="quiet" size="sm" onClick={share}>
                {copied ? 'Link copied ✓' : 'Copy a link to this scenario'}
              </Button>
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <GuidedView state={state} surface={surface} setSurface={setSurface} />
        </div>
      </div>
    </div>
  )
}

function GuidedView({
  state,
  surface,
  setSurface,
}: {
  state: TvmState
  surface: Surface
  setSurface: (s: Surface) => void
}) {
  const results = useMemo(() => computeTvm(state), [state])
  const isLoan = results.mode === 'loan'
  const tabs: TabItem<Surface>[] = isLoan
    ? [
        { value: 'overview', label: 'Overview' },
        { value: 'schedule', label: 'Year by year' },
        { value: 'math', label: 'The math' },
      ]
    : [
        { value: 'overview', label: 'Overview' },
        { value: 'math', label: 'The math' },
      ]
  const active = tabs.some((t) => t.value === surface) ? surface : 'overview'

  return (
    <>
      <div className={styles.tabBar}>
        <Tabs items={tabs} value={active} onChange={setSurface} />
      </div>
      <Card tone="raised" className={styles.panel}>
        {active === 'overview' && <Overview state={state} results={results} />}
        {active === 'schedule' && (
          <>
            <StepHeader
              title="Year by year"
              hint="How each year's payments split between interest and paying down what you owe."
            />
            <ScheduleTable rows={results.yearly} />
          </>
        )}
        {active === 'math' && (
          <>
            <StepHeader title="See the math" hint="The payment formula, with your numbers filled in." />
            <TvmMath state={state} results={results} />
          </>
        )}
      </Card>
    </>
  )
}

function Overview({ state, results }: { state: TvmState; results: TvmResults }) {
  const isLoan = results.mode === 'loan'
  const stats = isLoan ? (
    <div className={styles.stats}>
      <Stat
        label="Monthly payment"
        value={results.payment}
        format={formatUSDWhole}
        emphasis
        accentColor="var(--c-accent)"
      />
      <Stat label="Total you'll pay" value={results.totalPaid} format={formatUSDWhole} />
      <Stat
        label="Of that, interest"
        value={results.totalInterest}
        format={formatUSDWhole}
        accentColor="var(--c-series-2)"
      />
    </div>
  ) : (
    <div className={styles.stats}>
      <Stat
        label="Save each month"
        value={results.payment}
        format={formatUSDWhole}
        emphasis
        accentColor="var(--c-accent)"
      />
      <Stat label="You'll contribute" value={results.totalPaid} format={formatUSDWhole} />
      <Stat
        label="Interest adds"
        value={results.totalInterest}
        format={formatUSDWhole}
        accentColor="var(--c-series-1)"
      />
    </div>
  )

  return (
    <>
      <StepHeader
        title={isLoan ? 'Your monthly payment' : 'How much to save each month'}
        hint={
          isLoan
            ? 'This is what it takes to pay the loan off on schedule, and how much extra you pay in interest.'
            : 'This is what it takes to hit your goal on time, and how much of the goal interest covers for you.'
        }
      />
      {stats}
      <TvmChart results={results} years={state.years} overlayHeader={stats} />
      <Callout tone="note" label="In plain terms">
        {isLoan ? (
          <>
            Borrowing <strong>{formatUSDWhole(state.amount)}</strong> at {formatPercent(state.ratePct / 100, 2)}{' '}
            for {formatYears(state.years)} costs <strong>{formatUSDWhole(results.payment)}</strong> a
            month. You&rsquo;ll repay {formatUSDWhole(results.totalPaid)} in all;{' '}
            {formatUSDWhole(results.totalInterest)} of that is interest.
          </>
        ) : (
          <>
            To reach <strong>{formatUSDWhole(state.amount)}</strong> in {formatYears(state.years)} at{' '}
            {formatPercent(state.ratePct / 100, 2)}, set aside{' '}
            <strong>{formatUSDWhole(results.payment)}</strong> a month. You put in{' '}
            {formatUSDWhole(results.totalPaid)}; interest covers the other{' '}
            {formatUSDWhole(results.totalInterest)}.
          </>
        )}
      </Callout>
    </>
  )
}
