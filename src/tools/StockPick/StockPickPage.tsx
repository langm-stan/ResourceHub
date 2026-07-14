import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  SegmentedControl,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
import { COHORTS, FUND, STAKE, type Cohort } from './data'
import { ClassChart } from './components/ClassChart'
import styles from './StockPickPage.module.css'

type Surface = 'play' | 'own'

const TABS: TabItem<Surface>[] = [
  { value: 'play', label: 'Pick a stock' },
  { value: 'own', label: 'What you actually own' },
]

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

export function StockPickPage() {
  const [surface, setSurface] = useState<Surface>('play')

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Game · One stock or the fund</p>
        <h1 className={styles.h1}>Pick a stock. Any stock.</h1>
        <p className={styles.lead}>
          These are real companies, described exactly the way they looked at the time, with no
          future information. Put your $1,000 on the one you would have picked, or take the boring
          index fund. Then see what actually happened, dividends and bankruptcies included.
        </p>
      </header>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'play' && <Play />}
          {surface === 'own' && <WhatYouOwn />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Play() {
  const [year, setYear] = useState(2000)
  const [picked, setPicked] = useState<string | null>(null)
  const cohort = useMemo(() => COHORTS.find((c) => c.year === year)!, [year])

  const changeYear = (y: number) => {
    setYear(y)
    setPicked(null)
  }

  return picked === null ? (
    <PickBoard cohort={cohort} year={year} onYear={changeYear} onPick={setPicked} />
  ) : (
    <RevealBoard cohort={cohort} picked={picked} onAgain={() => setPicked(null)} onYear={changeYear} />
  )
}

function PickBoard({
  cohort,
  year,
  onYear,
  onPick,
}: {
  cohort: Cohort
  year: number
  onYear: (y: number) => void
  onPick: (t: string) => void
}) {
  return (
    <>
      <StepHeader title={`The class of ${year}`} hint={cohort.intro} />
      <div className={styles.modeRow}>
        <SegmentedControl
          label="Set the clock to"
          options={COHORTS.map((c) => ({ value: String(c.year), label: `January ${c.year}` }))}
          value={String(year)}
          onChange={(v) => onYear(Number(v))}
        />
      </div>
      <div className={styles.pickGrid}>
        {cohort.stocks.map((s) => (
          <button key={s.ticker} type="button" className={styles.pickCard} onClick={() => onPick(s.ticker)}>
            <div className={styles.pickTicker}>{s.ticker}</div>
            <div className={styles.pickName}>{s.name}</div>
            <div className={styles.pickBlurb}>{s.blurb}</div>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.pickCard} ${styles.fundCard}`}
          onClick={() => onPick('FUND')}
        >
          <div className={styles.pickTicker}>{FUND.ticker}</div>
          <div className={styles.pickName}>{FUND.name}</div>
          <div className={styles.pickBlurb}>{FUND.blurb}</div>
        </button>
      </div>
    </>
  )
}

function RevealBoard({
  cohort,
  picked,
  onAgain,
  onYear,
}: {
  cohort: Cohort
  picked: string
  onAgain: () => void
  onYear: (y: number) => void
}) {
  const fundValue = cohort.indexMultiple * STAKE
  const fundAt = cohort.fundAt
  const pick = cohort.stocks.find((s) => s.ticker === picked)
  const yourValue = pick ? pick.multiple * STAKE : fundValue
  const beatFund = cohort.stocks.filter((s) => s.multiple > cohort.indexMultiple).length
  const wipedOrLost = cohort.stocks.filter((s) => s.multiple < 1).length
  const others = COHORTS.filter((c) => c.year !== cohort.year)

  return (
    <>
      <StepHeader
        title={
          pick
            ? yourValue >= fundValue
              ? `${pick.name} beat the fund`
              : `${pick.name}: ${pick.outcome}`
            : 'You took the fund'
        }
        hint={`Every outcome below includes dividends. The dashed line is the ${formatUSDWhole(STAKE)} everyone started with.`}
      />
      <div className={styles.stats}>
        <Stat
          label={pick ? `Your $1,000 in ${pick.name}` : 'Your $1,000 in the fund'}
          value={yourValue}
          format={formatUSDWhole}
          emphasis
          accentColor={yourValue >= fundValue ? GREEN : CARDINAL}
          animate={false}
        />
        <Stat label="The boring fund" value={fundValue} format={formatUSDWhole} accentColor={GREEN} animate={false} />
        <Stat
          label="Picks that beat the fund"
          value={beatFund}
          format={(v) => `${Math.round(v)} of ${cohort.stocks.length}`}
          animate={false}
        />
        <Stat
          label="Picks that lost money"
          value={wipedOrLost}
          format={(v) => `${Math.round(v)} of ${cohort.stocks.length}`}
          accentColor={CARDINAL}
          animate={false}
        />
      </div>

      <Callout tone="plain" label="The fund at one, five, and ten years">
        {formatUSDWhole(STAKE)} in the fund from January {cohort.year} was{' '}
        {formatUSDWhole(fundAt.y1 * STAKE)} after one year
        {fundAt.y10 !== null
          ? `, ${formatUSDWhole(fundAt.y5 * STAKE)} after five, and ${formatUSDWhole(fundAt.y10 * STAKE)} after ten`
          : ` and ${formatUSDWhole(fundAt.y5 * STAKE)} after five (the ten-year mark arrives in 2031)`}
        ; by mid-2026 it was {formatUSDWhole(fundValue)}.{' '}
        {cohort.year === 2000
          ? 'From this start even the fund was still underwater at year ten. It recovered because a fund cannot go to zero; several picks below could not make the same promise.'
          : 'A pick has to beat these checkpoints at the horizon you would actually hold, not just at the finish line.'}
      </Callout>

      <ClassChart
        cohort={cohort}
        picked={picked}
        exportStats={[
          { label: 'The boring fund', value: formatUSDWhole(fundValue), color: GREEN },
          { label: 'Beat the fund', value: `${beatFund} of ${cohort.stocks.length}` },
          { label: 'Lost money', value: `${wipedOrLost} of ${cohort.stocks.length}`, color: CARDINAL },
        ]}
        caption={`The class of ${cohort.year}: $1,000 in each of the most famous stocks of the moment, January ${cohort.year} through mid-2026, dividends reinvested. Figures are approximate. Red bars ended below the money put in.`}
      />

      {pick && <Callout tone="note" label={`What happened to ${pick.name}`}>{pick.outcome}</Callout>}
      <Callout tone="mark" label={`What the class of ${cohort.year} teaches`}>{cohort.note}</Callout>

      <div className={styles.modeRow}>
        <Button variant="primary" onClick={onAgain}>
          Pick again
        </Button>{' '}
        {others.map((c) => (
          <Button key={c.year} variant="quiet" onClick={() => onYear(c.year)}>
            Try {c.year}
          </Button>
        ))}
      </div>
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
        one does the job in this comparison.
      </Callout>
      <Callout tone="plain" label="Where the numbers come from">
        The 8% average return and the risk numbers across these lessons describe broad stock
        funds. Bessembinder&rsquo;s census of every U.S. stock since 1926 found 57.4% trailed
        Treasury bills over their lifetimes and 4% of companies produced all the net wealth: the
        fund exists to make sure you hold that 4%.
      </Callout>
    </>
  )
}
