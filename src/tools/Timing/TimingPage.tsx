import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  NumberField,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole } from '../../lib/format'
import { BOTTOMS, LAST_LABEL, monthName, runStrategies } from './compute'
import { TimingChart } from './components/TimingChart'
import styles from './TimingPage.module.css'

type Surface = 'overview' | 'bottoms'

const TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'bottoms', label: 'The five bottoms' },
]

const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'

/*
 * Defaults: $1,000/month is a round, relatable contribution. Start 1990
 * gives a 36-year window covering all five bear markets; it is also a
 * start year for which the conclusion is robust at any cash rate. Cash
 * earning 1% reflects that savings accounts paid essentially nothing
 * from 2009 to 2021 and only a few percent outside those years.
 */
const DEFAULTS = { monthly: 1000, startYear: 1990, cashRate: 1 }

export function TimingPage() {
  const [surface, setSurface] = useState<Surface>('overview')
  const [monthly, setMonthly] = useState(DEFAULTS.monthly)
  const [startYear, setStartYear] = useState(DEFAULTS.startYear)
  const [cashRate, setCashRate] = useState(DEFAULTS.cashRate)

  const reset = () => {
    setMonthly(DEFAULTS.monthly)
    setStartYear(DEFAULTS.startYear)
    setCashRate(DEFAULTS.cashRate)
  }

  const r = useMemo(() => runStrategies(startYear, monthly, cashRate), [startYear, monthly, cashRate])

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Timing the market</p>
        <h1 className={styles.h1}>Time in the market, not timing the market</h1>
        <p className={styles.lead}>
          Everyone knows the winning move: hold your cash, wait for the crash, buy at the bottom.
          This lesson runs that plan against real S&amp;P 500 data since 1985, gives the timer
          perfect knowledge of every bear-market bottom, and still finds that the person who just
          bought every month usually dies richer. Then it asks what happens if the timer is one
          month late.
        </p>
      </header>

      <Card tone="raised" className={styles.controls}>
        <div className={styles.controlsHeader}>
          <StepHeader title="Set up the savers" hint={`Real monthly S&P 500 data with dividends, through ${LAST_LABEL}.`} />
          <Button variant="quiet" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
        <div className={styles.controlsGrid}>
          <NumberField
            label="Saved every month ($)"
            value={monthly}
            onChange={setMonthly}
            min={50}
            max={20000}
            prefix="$"
            precision={0}
          />
          <Slider
            label="Start saving in"
            value={startYear}
            onChange={setStartYear}
            min={1985}
            max={2015}
            step={1}
            readout={`January ${startYear}`}
            note="Try 1990, then 1997, then 2009."
          />
          <Slider
            label="Cash waiting for the bottom earns"
            value={cashRate}
            onChange={setCashRate}
            min={0}
            max={4}
            step={0.5}
            readout={`${cashRate}% per year`}
            note="Savings accounts paid close to 0% from 2009 to 2021."
          />
        </div>
        <p className={styles.footnote}>
          Prices are monthly averages of daily closes from Robert Shiller&rsquo;s public dataset,
          extended through {LAST_LABEL}; returns include dividends. A bottom is the lowest month of
          every bear market, a fall of 19% or more from the previous peak. The bottom buyer gets
          those dates for free, knowledge no real investor has.
        </p>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'overview' && <Overview r={r} startYear={startYear} cashRate={cashRate} />}
          {surface === 'bottoms' && <BottomsView />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Overview({
  r,
  startYear,
  cashRate,
}: {
  r: ReturnType<typeof runStrategies>
  startYear: number
  cashRate: number
}) {
  const lateGap = r.monthly - r.late
  const lateBehind = lateGap > 0
  const perfectBehind = r.monthly > r.perfect
  const waiting = r.perfectCashLeft > r.contributed * 0.05

  return (
    <>
      <StepHeader
        title="Three savers, the same paychecks"
        hint="One buys every month. One holds cash and nails every bottom exactly. One is a month late."
      />
      <div className={styles.stats}>
        <Stat label="Put in by everyone" value={r.contributed} format={formatUSDWhole} accentColor={SLATE} />
        <Stat label="Buys every month" value={r.monthly} format={formatUSDWhole} emphasis accentColor={GREEN} />
        <Stat
          label="Nails every bottom exactly"
          value={r.perfect}
          format={formatUSDWhole}
          note={perfectBehind ? 'with perfect foresight, and still behind' : 'perfect foresight pays here; read why below'}
        />
        <Stat
          label="One month late"
          value={r.late}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note={lateBehind ? `${formatUSDWhole(lateGap)} behind the monthly buyer` : 'ahead here; read why below'}
        />
      </div>

      <TimingChart
        points={r.points}
        bottoms={r.bottoms}
        exportStats={[
          { label: 'Put in', value: formatUSDWhole(r.contributed), color: SLATE },
          { label: 'Buys every month', value: formatUSDWhole(r.monthly), color: GREEN },
          { label: 'Nails every bottom', value: formatUSDWhole(r.perfect) },
          { label: 'One month late', value: formatUSDWhole(r.late), color: CARDINAL },
        ]}
        caption={`${formatUSDWhole(r.contributed)} saved from January ${startYear} through ${LAST_LABEL}, cash earning ${cashRate}% while it waits. Green: invested the day it arrives. Grey: deployed at the exact bottom of every bear market (dashed verticals). Red dashed: deployed one month after each bottom.`}
      />

      <Callout tone="mark" label="Wait. How does buying every bottom lose?">
        Check the receipts. The monthly buyer paid an average of{' '}
        <strong>{formatUSDWhole(r.avgPriceMonthly)}</strong> per index share; the bottom buyer
        paid <strong>{formatUSDWhole(r.avgPricePerfect)}</strong>.{' '}
        {r.avgPricePerfect > r.avgPriceMonthly ? (
          <>
            The sniper paid <em>more</em>: while the cash camped out waiting for a crash, the
            market climbed so far that the next bottom cost more than the ordinary months the
            monthly buyer had been quietly buying. The 2003 bottom was two and a half times the
            price of an average month in the early 1990s.
          </>
        ) : perfectBehind ? (
          <>
            The sniper did pay less per share, and still lost, because the monthly buyer&rsquo;s
            shares were bought years earlier: they spent that time growing and collecting
            dividends while the sniper&rsquo;s cash sat still. Cheap shares later lost to ordinary
            shares early.
          </>
        ) : (
          <>
            Here the sniper&rsquo;s price advantage was big enough to win. Read the next note
            before concluding the strategy works.
          </>
        )}{' '}
        {waiting && (
          <>
            And {formatUSDWhole(r.perfectCashLeft)} of the timer&rsquo;s money is still in cash,
            waiting for a crash that has not come.
          </>
        )}
      </Callout>
      <Callout tone="note" label="An honest exception">
        Slide the start to 1997 through 2001 and the timer wins: someone who began saving at the
        top of the dot-com bubble was paid, after the fact, for sitting in cash while the market
        halved. That is the exception that teaches the rule. You only know a peak was a peak
        afterward, the same way you only know a bottom afterward, and a plan that works for one
        starting decade and fails for the rest is not a plan.
      </Callout>
      <Callout tone="plain" label="Why one month matters so much">
        Rebounds off bear-market bottoms are violent. The month after the March 2009 bottom, the
        index jumped about 9%; after March 2020, about 10%. Wait one month to be sure the bottom
        was real and the discount you camped in cash for years to capture is substantially gone.
        Think you would have caught it live? The Beat the Market game in the sidebar deals you a
        mystery decade of this same data and one sell button. Bring a class and keep score.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function BottomsView() {
  return (
    <>
      <StepHeader
        title="Every bear market since 1985"
        hint="A bottom is the lowest monthly average price of each fall of 19% or more from a prior peak."
      />
      <div className={styles.stats}>
        {BOTTOMS.map((b) => (
          <Stat
            key={b.index}
            label={`${monthName(b.m)} ${b.y}`}
            value={-b.drawdown}
            format={(v) => `-${formatPercent(v, 0)}`}
            accentColor={CARDINAL}
            animate={false}
            note={
              b.y === 1987
                ? 'the October 1987 crash'
                : b.y === 2003
                  ? 'the dot-com bust, two and a half years peak to trough'
                  : b.y === 2009
                    ? 'the global financial crisis'
                    : b.y === 2020
                      ? 'the COVID crash, five weeks peak to trough'
                      : 'the 2022 inflation bear market'
            }
          />
        ))}
      </div>
      <Callout tone="note" label="Nobody rang a bell">
        These dates are obvious only in hindsight. In March 2009 the news was bank failures and
        10% unemployment ahead; in March 2020 the world was locking down. The plan &ldquo;I will
        buy when things look worst&rdquo; asks you to act on the exact days it feels most wrong,
        with your whole savings at once. The monthly buyer never has to be brave, because no
        single purchase matters much.
      </Callout>
      <Callout tone="plain" label="A note on the dates">
        Prices here are monthly averages, so the bottom months can differ from the famous daily
        lows: the dot-com bear&rsquo;s lowest daily close was October 2002, but February 2003 was
        the cheapest month on average. Daily data would only sharpen the lesson, since the exact
        daily bottom is even harder to hit.
      </Callout>
    </>
  )
}
