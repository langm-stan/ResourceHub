import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole } from '../../lib/format'
import { COHORTS, STAKE } from '../StockPick/data'
import { ClassChart } from '../StockPick/components/ClassChart'
import {
  MARKET_SD,
  computePortfolioCurve,
  portfolioSd,
  simulateSingleStocks,
} from '../Diversification/compute'
import { SingleStockChart } from '../Diversification/components/SingleStockChart'
import { PortfolioRiskChart } from '../Diversification/components/PortfolioRiskChart'
import styles from './SingleStockPage.module.css'

type Surface = 'classes' | 'why' | 'own'

const TABS: TabItem<Surface>[] = [
  { value: 'classes', label: 'Three famous classes' },
  { value: 'why', label: 'Why it keeps happening' },
  { value: 'own', label: 'What you actually own' },
]

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

export function SingleStockPage() {
  const [surface, setSurface] = useState<Surface>('classes')

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · One stock or the fund</p>
        <h1 className={styles.h1}>A single stock vs. owning them all</h1>
        <p className={styles.lead}>
          Every famous stock and a broad index fund promise the same thing: a share of corporate
          America&rsquo;s growth. The difference is what happens when you are wrong. This lesson
          starts with the real record of the most loved stocks of 2000, 2010, and 2021, then shows
          why the same pattern keeps coming back.
        </p>
      </header>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'classes' && <Classes />}
          {surface === 'why' && <Why />}
          {surface === 'own' && <WhatYouOwn />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Classes() {
  const [year, setYear] = useState(2000)
  const cohort = useMemo(() => COHORTS.find((c) => c.year === year)!, [year])
  const fundValue = cohort.indexMultiple * STAKE
  const beatFund = cohort.stocks.filter((s) => s.multiple > cohort.indexMultiple).length
  const lost = cohort.stocks.filter((s) => s.multiple < 1).length

  return (
    <>
      <StepHeader title={`The class of ${year}`} hint={cohort.intro} />
      <div className={styles.modeRow}>
        <SegmentedControl
          label="Set the clock to"
          options={COHORTS.map((c) => ({ value: String(c.year), label: `January ${c.year}` }))}
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
        />
      </div>

      <div className={styles.stats}>
        <Stat
          label="$1,000 in the index fund became"
          value={fundValue}
          format={formatUSDWhole}
          emphasis
          accentColor={GREEN}
          animate={false}
        />
        <Stat
          label="Stocks that beat the fund"
          value={beatFund}
          format={(v) => `${Math.round(v)} of ${cohort.stocks.length}`}
          animate={false}
        />
        <Stat
          label="Stocks that lost money"
          value={lost}
          format={(v) => `${Math.round(v)} of ${cohort.stocks.length}`}
          accentColor={CARDINAL}
          animate={false}
        />
      </div>

      <ClassChart
        cohort={cohort}
        picked=""
        exportStats={[
          { label: 'The index fund', value: formatUSDWhole(fundValue), color: GREEN },
          { label: 'Beat the fund', value: `${beatFund} of ${cohort.stocks.length}` },
          { label: 'Lost money', value: `${lost} of ${cohort.stocks.length}`, color: CARDINAL },
        ]}
        caption={`The class of ${cohort.year}: $1,000 in each of the most famous stocks of the moment, January ${cohort.year} through mid-2026, dividends reinvested and corporate actions included. Figures are approximate. Red bars ended below the money put in.`}
      />

      <Callout tone="plain" label="The fund at one, five, and ten years">
        {formatUSDWhole(STAKE)} in the fund from January {cohort.year} was{' '}
        {formatUSDWhole(cohort.fundAt.y1 * STAKE)} after one year
        {cohort.fundAt.y10 !== null
          ? `, ${formatUSDWhole(cohort.fundAt.y5 * STAKE)} after five, and ${formatUSDWhole(cohort.fundAt.y10 * STAKE)} after ten`
          : ` and ${formatUSDWhole(cohort.fundAt.y5 * STAKE)} after five (the ten-year mark arrives in 2031)`}
        ; by mid-2026 it was {formatUSDWhole(fundValue)}.{' '}
        {cohort.year === 2000
          ? 'From this start even the fund was still underwater at year ten. It recovered because a fund cannot go to zero; several stocks below could not make the same promise.'
          : 'A pick has to beat these checkpoints at the horizon you would actually hold, not just at the finish line.'}
      </Callout>

      <Callout tone="mark" label={`What the class of ${cohort.year} teaches`}>{cohort.note}</Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Why() {
  const [years, setYears] = useState(30)
  const sim = useMemo(() => simulateSingleStocks(years), [years])
  const curve = useMemo(() => computePortfolioCurve(60), [])

  return (
    <>
      <StepHeader
        title="Same average return, opposite experiences"
        hint="Every grey line is a simulated stock with an 8% average return and a 40% swing, sharing one market. The green line is the index."
      />

      <div className={styles.modeRow}>
        <Slider
          label="Hold for"
          value={years}
          onChange={setYears}
          min={5}
          max={40}
          step={1}
          readout={`${years} years`}
          note="Longer holding periods separate the lines further."
        />
      </div>

      <div className={styles.stats}>
        <Stat
          label="Chance one stock beats the index"
          value={sim.pBeatIndex}
          format={(v) => formatPercent(v, 0)}
          emphasis
          accentColor={CARDINAL}
          animate={false}
        />
        <Stat
          label="Chance one stock loses money"
          value={sim.pLoseMoney}
          format={(v) => formatPercent(v, 0)}
          animate={false}
          note={`after ${years} years, dividends included`}
        />
        <Stat
          label="The median stock turns $1 into"
          value={sim.medianStockMultiple}
          format={(v) => `$${v.toFixed(2)}`}
          animate={false}
          note={`the median index dollar becomes $${sim.medianIndexMultiple.toFixed(2)}`}
        />
      </div>

      <SingleStockChart
        sim={sim}
        exportStats={[
          { label: 'Chance a stock beats the index', value: formatPercent(sim.pBeatIndex, 0), color: CARDINAL },
          { label: 'Chance a stock loses money', value: formatPercent(sim.pLoseMoney, 0) },
          { label: 'Median stock, $1 becomes', value: `$${sim.medianStockMultiple.toFixed(2)}` },
          { label: 'Median index, $1 becomes', value: `$${sim.medianIndexMultiple.toFixed(2)}`, color: GREEN },
        ]}
        caption={`Sixty simulated stocks over ${years} years, each with the same 8% average return as the index and a 40% yearly swing, sharing one market. Log scale. A few huge winners hold the average up; the typical stock drifts sideways or down: the same shape as the class charts, generated by the arithmetic instead of by history.`}
      />

      <Callout tone="mark" label="The real-world census says the same">
        Bessembinder (Journal of Financial Economics, 2018) measured every U.S. common stock from
        1926 to 2016: <strong>57.4% underperformed one-month Treasury bills</strong> over their
        lifetimes, more than half delivered negative lifetime returns, and the single most common
        lifetime outcome, rounded to the nearest 5%, was <strong>a loss of 100%</strong>. Just 4%
        of firms account for all of the net wealth the stock market ever created above T-bills.
        The fund exists to make sure you hold that 4%.
      </Callout>

      <PortfolioRiskChart
        points={curve}
        n={1}
        exportStats={[
          { label: 'One stock, typical swing', value: formatPercent(portfolioSd(1), 0), color: CARDINAL },
          { label: 'The whole market', value: formatPercent(MARKET_SD, 0), color: GREEN },
        ]}
        caption={`How the risk leaves as stocks are added, all with the same 8% expected return. Green: real stocks, which move together when the economy moves. Grey dashed: the same stocks if they were independent. The first ten stocks do most of the work; a broad fund holds hundreds and sits on the ${formatPercent(MARKET_SD, 0)} floor.`}
      />

      <Callout tone="note" label="Why an average this good hides a median this bad">
        Volatility drag: a stock that falls 40% needs a 67% gain to get even, so big swings eat
        compound growth. With the same 8% average, the 40%-swing stock has a median growth rate
        near zero while the 20%-swing fund compounds near 6%. The market&rsquo;s return is not the
        typical stock&rsquo;s return; it is the winners&rsquo; return, and diversification is how
        you make sure you own the winners.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function WhatYouOwn() {
  return (
    <>
      <StepHeader
        title="One share of a stock vs. one share of a fund"
        hint="A mutual fund or ETF is not a different bet on the same game. It is a different thing to own."
      />
      <div className={styles.ownTable}>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel} />
          <span className={styles.ownHead}>One company&rsquo;s stock</span>
          <span className={styles.ownHead}>A broad index fund (ETF or mutual fund)</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>You own</span>
          <span>One company</span>
          <span>About 500 companies, weighted by size, in a single share</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>Yearly cost on $1,000</span>
          <span>$0 to hold</span>
          <span>About 30 cents at a typical 0.03% index expense ratio</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>If the CEO lies</span>
          <span>You can lose everything (ask the class of 2000 about Enron)</span>
          <span>The other 499 companies carry on</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>Chance of going to zero</span>
          <span>Real: the most common lifetime outcome for a stock is a near-total loss</span>
          <span>Would require all 500 largest U.S. companies to fail at once</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>Catching the winners</span>
          <span>Only if you name them in advance</span>
          <span>Automatic: whatever becomes huge grows into the fund</span>
        </div>
        <div className={styles.ownRow}>
          <span className={styles.ownLabel}>Homework required</span>
          <span>Earnings calls, news, nerve</span>
          <span>None; that is the point</span>
        </div>
      </div>
      <Callout tone="note" label="Mutual fund or ETF?">
        Same basket, different wrapper. A mutual fund prices once a day after the close and is the
        default inside retirement accounts; an ETF trades all day like a stock and is usually a
        touch cheaper and more tax efficient in a regular account. For a diversified index, either
        one does the job in this comparison. SPY, the S&amp;P 500 ETF in the Gambling vs.
        Investing lesson, is the oldest and largest of them.
      </Callout>
    </>
  )
}
