import { useMemo } from 'react'
import { Callout, Card, SegmentedControl, Slider, Stat, StepHeader } from '../../design-system'
import { formatPercent } from '../../lib/format'
import { usePersistentState } from '../../hooks/usePersistentState'
import {
  HISTORY_FIRST_YEAR,
  HISTORY_LAST_YEAR,
  aheadShareOf,
  rollingSeries,
  seriesStats,
} from './compute'
import { RollingChart, type ChartSeries } from './components/RollingChart'
import styles from './GamblingPage.module.css'

/*
 * Stocks vs. bonds by holding period: 98 years of rolling windows from
 * the Damodaran annual series (see ./historyData.ts). It opens on the
 * plain story, the S&P 500 one year at a time, and every step of
 * flexibility is a control: the start year, the stock window, and an
 * optional comparison asset with its own window. Lives two places, as
 * the same component: its own Teacher Training tool (Thursday AM) and
 * the "Stocks vs. bonds" tab of the Gambling vs. Investing lesson.
 */

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

type PeriodKey = '1' | '5' | '10' | '20' | '30'

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '1', label: '1 year' },
  { value: '5', label: '5 years' },
  { value: '10', label: '10 years' },
  { value: '20', label: '20 years' },
  { value: '30', label: '30 years' },
]

const isPeriodKey = (v: string): v is PeriodKey => PERIOD_OPTIONS.some((o) => o.value === v)

type CompareKey = 'none' | 'sp' | 'bond' | 'bill' | 'baa'

const ASSETS: Record<
  Exclude<CompareKey, 'none'>,
  { menu: string; label: string; plural: string; short: string; color: string; colorWord: string }
> = {
  sp: {
    menu: 'Stocks again',
    label: 'Stocks (S&P 500)',
    plural: 'the same index',
    short: 'Stocks',
    color: 'var(--c-series-4)',
    colorWord: 'cardinal red',
  },
  bond: {
    menu: '10-yr Treasury',
    label: '10-year Treasury bond',
    plural: '10-year Treasury bonds',
    short: 'T-bonds',
    color: 'var(--c-series-2)',
    colorWord: 'amber',
  },
  bill: {
    menu: 'T-bills',
    label: '3-month Treasury bills',
    plural: '3-month Treasury bills',
    short: 'T-bills',
    color: 'var(--c-series-3)',
    colorWord: 'grey',
  },
  baa: {
    menu: 'Baa corporate',
    label: 'Baa corporate bonds',
    plural: 'Baa corporate bonds',
    short: 'Corp bonds',
    color: 'var(--c-series-5)',
    colorWord: 'violet',
  },
}

const isCompareKey = (v: string): v is CompareKey => v === 'none' || v in ASSETS

export function StocksBondsContent({ figure = 'Figure 1.' }: { figure?: string } = {}) {
  const [startYear, setStartYear] = usePersistentState(
    'ifdm-stocks-bonds-start',
    HISTORY_FIRST_YEAR,
    (v) => Number.isInteger(v) && v >= HISTORY_FIRST_YEAR && v <= HISTORY_LAST_YEAR
  )
  const [spPeriodKey, setSpPeriodKey] = usePersistentState<PeriodKey>(
    'ifdm-stocks-bonds-period',
    '1',
    isPeriodKey
  )
  const [compareKey, setCompareKey] = usePersistentState<CompareKey>(
    'ifdm-stocks-bonds-compare',
    'none',
    isCompareKey
  )
  const [cmpPeriodKey, setCmpPeriodKey] = usePersistentState<PeriodKey>(
    'ifdm-stocks-bonds-compare-period',
    '1',
    isPeriodKey
  )

  const spPeriod = Number(spPeriodKey)
  const cmpPeriod = Number(cmpPeriodKey)
  const asset = compareKey === 'none' ? null : ASSETS[compareKey]

  /* Start year clips the chart's left edge (the window end year), not the
     lookback; keep a handful of end-years visible up to 2025. */
  const maxStart = HISTORY_LAST_YEAR - 5
  const start = Math.min(startYear, maxStart)

  const spSeries: ChartSeries = useMemo(
    () => ({
      points: rollingSeries('sp', spPeriod, start),
      period: spPeriod,
      label: 'Stocks (S&P 500)',
      short: 'Stocks',
      color: GREEN,
    }),
    [spPeriod, start]
  )
  const cmpSeries: ChartSeries | undefined = useMemo(
    () =>
      compareKey === 'none'
        ? undefined
        : {
            points: rollingSeries(compareKey, cmpPeriod, start),
            period: cmpPeriod,
            label: ASSETS[compareKey].label,
            // The same-index comparison shares the green line's name, so tag it
            // with its window to tell the two apart at the right edge.
            short: compareKey === 'sp' ? `Stocks ${cmpPeriod}yr` : ASSETS[compareKey].short,
            color: ASSETS[compareKey].color,
          },
    [compareKey, cmpPeriod, start]
  )

  const sp = useMemo(() => seriesStats(spSeries.points), [spSeries])
  const cmp = useMemo(() => (cmpSeries ? seriesStats(cmpSeries.points) : null), [cmpSeries])
  const ahead = useMemo(
    () => (cmpSeries ? aheadShareOf(spSeries.points, cmpSeries.points) : null),
    [spSeries, cmpSeries]
  )

  // The long-horizon facts quoted in the callout, fixed at 20 years on full history.
  const twenty = useMemo(() => {
    const stocks20 = rollingSeries('sp', 20, HISTORY_FIRST_YEAR)
    const bonds20 = rollingSeries('bond', 20, HISTORY_FIRST_YEAR)
    return { beat: aheadShareOf(stocks20, bonds20), worst: seriesStats(stocks20).worst }
  }, [])

  const stretchWord = spPeriod === 1 ? 'calendar year' : `${spPeriod}-year stretch`
  const cmpStretchWord = cmpPeriod === 1 ? 'calendar year' : `${cmpPeriod}-year stretch`
  // The leftmost end year actually drawn (a long window near the start year may
  // begin later than `start` if it would reach before 1928).
  const firstEnd = spSeries.points[0]?.end ?? start

  const caption = asset
    ? `Annualized return of the S&P 500 with dividends over every ${stretchWord} (green) and ${asset.plural} over every ${cmpStretchWord} (${asset.colorWord}), each plotted at the year its window ends, from ${firstEnd} to ${HISTORY_LAST_YEAR}. Every window looks back its full length, into data as old as ${HISTORY_FIRST_YEAR}. The green series ranged from ${formatPercent(sp.worst, 1)} a year (window ending ${sp.worstEnd}) to ${formatPercent(sp.best, 1)} (ending ${sp.bestEnd}); the ${asset.colorWord} one from ${formatPercent(cmp!.worst, 1)} to ${formatPercent(cmp!.best, 1)}.`
    : `Annualized return of the S&P 500 with dividends over every ${stretchWord}, plotted at the year its window ends, from ${firstEnd} to ${HISTORY_LAST_YEAR}. The worst window returned ${formatPercent(sp.worst, 1)} a year (ending ${sp.worstEnd}) and the best ${formatPercent(sp.best, 1)} a year (ending ${sp.bestEnd}). Use the comparison control to lay a second series alongside it, another asset or the same stocks at a longer window.`

  return (
    <>
      <StepHeader
        title="Stocks and bonds by holding period"
        hint={`Every rolling window of market history, drawn at the year it ends. The start year sets the chart's left edge; each window still looks back its full length. Lengthen the window and watch the stock line calm down.`}
      />
      <div className={styles.rollingControls}>
        <Slider
          label="Start year"
          value={start}
          onChange={setStartYear}
          min={HISTORY_FIRST_YEAR}
          max={maxStart}
          step={1}
          readout={String(start)}
          note={`The chart runs from ${start} to ${HISTORY_LAST_YEAR}; each window looks back over its own length.`}
        />
        <SegmentedControl
          label="Stocks rolling window"
          options={PERIOD_OPTIONS}
          value={spPeriodKey}
          onChange={setSpPeriodKey}
        />
        <SegmentedControl
          label="Compare against"
          options={[
            { value: 'none', label: 'None' },
            { value: 'sp', label: ASSETS.sp.menu },
            { value: 'bond', label: ASSETS.bond.menu },
            { value: 'bill', label: ASSETS.bill.menu },
            { value: 'baa', label: ASSETS.baa.menu },
          ]}
          value={compareKey}
          onChange={setCompareKey}
        />
        {asset && (
          <SegmentedControl
            label={`${compareKey === 'sp' ? 'Comparison stocks' : asset.short} rolling window`}
            options={PERIOD_OPTIONS}
            value={cmpPeriodKey}
            onChange={setCmpPeriodKey}
          />
        )}
      </div>

      <div className={styles.assetRows}>
        <div>
          <p className={styles.assetHead}>
            <span className={styles.assetSwatch} style={{ background: GREEN }} aria-hidden="true" />
            Stocks (S&amp;P 500) · {spPeriod === 1 ? 'one year at a time' : `${spPeriod}-year windows`}
          </p>
          <div className={styles.stats}>
            <Stat
              label="Average"
              value={sp.mean}
              format={(v) => `${formatPercent(v, 1)}/yr`}
              note={`${sp.n} windows ending ${firstEnd}–${HISTORY_LAST_YEAR}`}
            />
            <Stat
              label="Standard deviation"
              value={sp.sd}
              format={(v) => formatPercent(v, 1)}
              emphasis
              accentColor={GREEN}
              note="the typical distance from the average"
            />
            <Stat
              label="Worst window"
              value={sp.worst}
              format={(v) => `${formatPercent(v, 1)}/yr`}
              accentColor={sp.worst < 0 ? CARDINAL : GREEN}
              note={`ending ${sp.worstEnd}`}
            />
            <Stat
              label="Lost money"
              value={sp.losing / Math.max(1, sp.n)}
              format={(v) => formatPercent(v, 0)}
              accentColor={sp.losing === 0 ? GREEN : CARDINAL}
              note={`${sp.losing} of ${sp.n} windows`}
            />
          </div>
        </div>
        {asset && cmp && (
          <div>
            <p className={styles.assetHead}>
              <span className={styles.assetSwatch} style={{ background: asset.color }} aria-hidden="true" />
              {asset.label} · {cmpPeriod === 1 ? 'one year at a time' : `${cmpPeriod}-year windows`}
            </p>
            <div className={styles.stats}>
              <Stat
                label="Average"
                value={cmp.mean}
                format={(v) => `${formatPercent(v, 1)}/yr`}
                note={`${cmp.n} windows ending ${cmpSeries!.points[0]?.end ?? firstEnd}–${HISTORY_LAST_YEAR}`}
              />
              <Stat
                label="Standard deviation"
                value={cmp.sd}
                format={(v) => formatPercent(v, 1)}
                emphasis
                accentColor={asset.color}
                note={
                  cmp.sd < sp.sd
                    ? `${(sp.sd / Math.max(cmp.sd, 0.0001)).toFixed(1)}× steadier than the stock row`
                    : undefined
                }
              />
              <Stat
                label="Worst window"
                value={cmp.worst}
                format={(v) => `${formatPercent(v, 1)}/yr`}
                accentColor={cmp.worst < 0 ? CARDINAL : GREEN}
                note={`ending ${cmp.worstEnd}`}
              />
              <Stat
                label="Lost money"
                value={cmp.losing / Math.max(1, cmp.n)}
                format={(v) => formatPercent(v, 0)}
                accentColor={cmp.losing === 0 ? GREEN : CARDINAL}
                note={`${cmp.losing} of ${cmp.n} windows`}
              />
            </div>
          </div>
        )}
      </div>
      {asset && ahead !== null && compareKey !== 'sp' && (
        <p className={styles.aheadNote}>
          Stocks finished ahead of {asset.plural} in <strong>{formatPercent(ahead, 0)}</strong> of
          windows ending the same year.
        </p>
      )}

      <RollingChart
        stocks={spSeries}
        compare={cmpSeries}
        figure={figure}
        exportStats={[
          { label: `Average, stocks ${spPeriod}yr`, value: `${formatPercent(sp.mean, 1)}/yr`, color: GREEN },
          { label: 'Std deviation, stocks', value: formatPercent(sp.sd, 1), color: GREEN },
          ...(asset && cmp
            ? [
                {
                  label: `Std deviation, ${compareKey === 'sp' ? `stocks ${cmpPeriod}yr` : asset.short}`,
                  value: formatPercent(cmp.sd, 1),
                  color: asset.color,
                },
              ]
            : [
                {
                  label: `Worst ${stretchWord}`,
                  value: `${formatPercent(sp.worst, 1)}/yr`,
                  color: sp.worst < 0 ? CARDINAL : GREEN,
                },
              ]),
        ]}
        caption={caption}
      />

      <Callout tone="mark" label="Why longer windows are steadier">
        Each year of history is a draw from the same lopsided coin: positive expected value with a
        wide swing. Held one year at a time, stocks lost money in roughly one year of every four.
        But the swings partly cancel across years, the law of large numbers again, and since{' '}
        {HISTORY_FIRST_YEAR} <strong>no 20- or 30-year stretch of the U.S. stock market has ever
        finished with a loss</strong>. The worst 20-year run still returned{' '}
        {formatPercent(twenty.worst, 1)} a year, and stocks beat the 10-year Treasury in{' '}
        {formatPercent(twenty.beat, 0)} of all 20-year windows. A gamble repeated gets more
        certainly bad; this bet held gets more certainly good.
      </Callout>
      <Callout tone="note" label="What bonds are for">
        Set the comparison to the 10-year Treasury and hold both windows at one year: the bond
        line hugs its average while the stock line whips between {formatPercent(-0.44, 0)} and{' '}
        {formatPercent(0.53, 0)}, which is exactly why money needed soon belongs in bonds or
        bills. But steadiness is not safety over decades: bonds can lose too (2022 was the worst
        10-year Treasury year in the whole series), and at 20- or 30-year windows the stock line
        sits above every bond series in almost every window while inflation quietly eats the
        T-bill line.
      </Callout>
      <p className={styles.footnote}>
        Source: Aswath Damodaran, NYU Stern, annual returns {HISTORY_FIRST_YEAR} to{' '}
        {HISTORY_LAST_YEAR}. Stocks are the S&amp;P 500 with dividends reinvested; Treasury bonds
        are the 10-year note including price changes; bills are 3-month Treasury bills; Baa
        corporate bonds are Moody&rsquo;s Baa-rated long-term debt. Each window&rsquo;s figure is
        the annualized (geometric average) return, before inflation and taxes.
      </p>
    </>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function StocksBondsPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Stocks vs. bonds</p>
          <h1 className={styles.h1}>Stocks, bonds, and the holding period</h1>
          <p className={styles.lead}>
            A stock is a share of a business&rsquo;s profits; a bond is a loan with a promised
            payment. The bond is the steadier year, the stock is the better decade, and 98 years
            of market history show exactly how the holding period settles the contest between
            them.
          </p>
        </header>
      )}
      <Card tone="raised" className={styles.panel}>
        <StocksBondsContent />
      </Card>
    </div>
  )
}
