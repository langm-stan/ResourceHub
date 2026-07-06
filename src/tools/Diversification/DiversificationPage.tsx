import { useMemo, useState } from 'react'
import {
  Callout,
  Card,
  FormulaBlock,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent } from '../../lib/format'
import {
  EXPECTED_RETURN,
  MARKET_SD,
  RHO,
  SINGLE_STOCK_SD,
  computeCoinGame,
  computePortfolioCurve,
  portfolioSd,
  simulateSingleStocks,
} from './compute'
import { CoinGameChart } from './components/CoinGameChart'
import { PortfolioRiskChart } from './components/PortfolioRiskChart'
import { SingleStockChart } from './components/SingleStockChart'
import styles from './DiversificationPage.module.css'

type Surface = 'coins' | 'stocks' | 'single' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'coins', label: 'The coin game' },
  { value: 'stocks', label: 'From coins to stocks' },
  { value: 'single', label: 'One stock or the market' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

/** Small probabilities read better as words than as 0.00%. */
function formatProb(p: number): string {
  if (p <= 0) return '0%'
  if (p < 0.000001) return 'under 1 in a million'
  if (p < 0.0001) return 'under 0.01%'
  return formatPercent(p, p < 0.01 ? 2 : p < 0.1 ? 1 : 0)
}

export function DiversificationPage() {
  const [surface, setSurface] = useState<Surface>('coins')

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Risk diversification</p>
        <h1 className={styles.h1}>Do not put all your eggs in one basket</h1>
        <p className={styles.lead}>
          A typical large U.S. stock and the S&amp;P 500 index have earned about the same 8% average
          return. But the single stock swings about 40% in a typical year, and the index only about
          20%. Half of the risk simply disappears, and nobody pays for it. This lesson shows where
          it goes, starting with a coin.
        </p>
      </header>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'coins' && <CoinGame />}
          {surface === 'stocks' && <StockPortfolio />}
          {surface === 'single' && <SingleStock />}
          {surface === 'math' && <MathView />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CoinGame() {
  const [flips, setFlips] = useState(1)
  const game = useMemo(() => computeCoinGame(flips), [flips])

  return (
    <>
      <StepHeader
        title="One dollar, more and more coins"
        hint="You bet $1 on fair coin flips: heads you win, tails you lose. One flip risks the whole dollar. Split the same dollar across many flips and watch the extremes vanish."
      />

      <div className={styles.modeRow}>
        <Slider
          label="Split the dollar across"
          value={flips}
          onChange={setFlips}
          min={1}
          max={100}
          step={1}
          readout={`${flips} ${flips === 1 ? 'flip' : 'flips'} of ${flips === 1 ? '$1' : `${(100 / flips).toFixed(flips > 50 ? 1 : 0)}¢ each`}`}
          note="Try 1, then 2, then 20, then 100."
        />
      </div>

      <div className={styles.stats}>
        <Stat
          label="Chance you lose the whole dollar"
          value={game.pLoseAll}
          format={formatProb}
          emphasis
          accentColor={CARDINAL}
          animate={false}
        />
        <Stat
          label="Chance you lose 50¢ or more"
          value={game.pLoseHalf}
          format={formatProb}
          animate={false}
        />
        <Stat
          label="Chance you end within a dime of even"
          value={game.pNearEven}
          format={formatProb}
          accentColor={GREEN}
          animate={false}
        />
      </div>

      <CoinGameChart
        outcomes={game.outcomes}
        n={flips}
        exportStats={[
          { label: 'Flips', value: `${flips}` },
          { label: 'Lose the whole $1', value: formatProb(game.pLoseAll), color: CARDINAL },
          { label: 'Lose 50¢ or more', value: formatProb(game.pLoseHalf) },
          { label: 'Within a dime of even', value: formatProb(game.pNearEven), color: GREEN },
        ]}
        caption={
          flips === 1
            ? 'With one flip there are only two outcomes: lose the dollar or double it, 50% each. Every play is all or nothing.'
            : `The same $1 spread across ${flips} flips. Each bar is one possible result; red bars are losses, green bars are gains. The chance of losing the whole dollar is now ${formatProb(game.pLoseAll)}.`
        }
      />

      <Callout tone="note" label="Independence does the work">
        No single flip got safer: each one is still 50/50. What changed is that the flips are
        independent, so one flip&rsquo;s result says nothing about the next. Across many flips the
        heads and tails cancel, and the total lands near the middle almost every time. Twenty
        straight tails happens less than once in a million tries.
      </Callout>
      <Callout tone="plain" label="Same expected value, less risk">
        The average outcome of this game is $0 whether you flip once or a hundred times.
        Diversification never changed what you expect to make. It changed how far from that
        expectation you can land.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function StockPortfolio() {
  const [stocks, setStocks] = useState(1)
  const curve = useMemo(() => computePortfolioCurve(60), [])
  const sd = portfolioSd(stocks)
  const removed = (SINGLE_STOCK_SD - sd) / (SINGLE_STOCK_SD - MARKET_SD)

  return (
    <>
      <StepHeader
        title="From coins to a portfolio of stocks"
        hint="Each stock is like a coin with an 8% average return and a 40% typical swing. But real stocks do not flip independently: they share the economy."
      />

      <div className={styles.modeRow}>
        <Slider
          label="Stocks in the portfolio"
          value={stocks}
          onChange={setStocks}
          min={1}
          max={60}
          step={1}
          readout={`${stocks} ${stocks === 1 ? 'stock' : 'stocks'}`}
          note="Equal amounts in each. A broad index fund holds hundreds."
        />
      </div>

      <div className={styles.stats}>
        <Stat
          label="Typical yearly swing, your portfolio"
          value={sd}
          format={(v) => formatPercent(v, 0)}
          emphasis
          accentColor={GREEN}
          note={`two thirds of years land between ${formatPercent(EXPECTED_RETURN - sd, 0)} and ${formatPercent(EXPECTED_RETURN + sd, 0)}`}
        />
        <Stat
          label="The whole market"
          value={MARKET_SD}
          format={(v) => formatPercent(v, 0)}
          accentColor={CARDINAL}
          animate={false}
          note="the floor no number of stocks gets under"
        />
        <Stat
          label="Removable risk removed"
          value={Math.max(0, removed)}
          format={(v) => formatPercent(v, 0)}
          note="of the gap between one stock and the market"
        />
      </div>

      <PortfolioRiskChart
        points={curve}
        n={stocks}
        exportStats={[
          { label: 'Stocks held', value: `${stocks}` },
          { label: 'Typical yearly swing', value: formatPercent(sd, 0), color: GREEN },
          { label: 'Market floor', value: formatPercent(MARKET_SD, 0), color: CARDINAL },
        ]}
        caption={`Typical yearly swing (one standard deviation) as stocks are added, all with the same 8% expected return. Green: real stocks, which move together when the economy moves. Grey dashed: the same stocks if they were fully independent. The first ten stocks do most of the work; no number of stocks breaks the ${formatPercent(MARKET_SD, 0)} floor.`}
      />

      <Callout tone="mark" label="The 20% that will not leave">
        Bad management at one company hurts one stock; a recession or a pandemic hits every stock
        at once. The first kind, idiosyncratic risk, diversifies away. The second kind, systematic
        risk, is the market itself and stays at about {formatPercent(MARKET_SD, 0)} no matter how
        many stocks you hold. Carrying it is what the 8% average return pays for.
      </Callout>
      <Callout tone="note" label="This is what mutual funds and ETFs are for">
        Buying 60 stocks yourself is a chore. One share of a broad index fund or ETF buys hundreds
        of them at once, so a first paycheck can hold a fully diversified portfolio. The chart
        explains why the boring fund is the safer bet than any single favorite company.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function SingleStock() {
  const [years, setYears] = useState(30)
  const sim = useMemo(() => simulateSingleStocks(years), [years])

  return (
    <>
      <StepHeader
        title="Sixty stocks, one market, the same average return"
        hint="Every grey line is a simulated stock with an 8% average return and a 40% swing. The green line is the index. Watch where the average comes from."
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
        caption={`Sixty simulated stocks over ${years} years, each with the same 8% average return as the index and a 40% yearly swing, sharing one market. Log scale. A few huge winners hold the average up; the typical stock drifts sideways or down. Owning the index means owning the winners without having to name them in advance.`}
      />

      <Callout tone="mark" label="The real-world version is worse">
        Bessembinder (Journal of Financial Economics, 2018) measured every U.S. common stock from
        1926 to 2016: <strong>57.4% underperformed one-month Treasury bills</strong> over their
        lifetimes, more than half delivered negative lifetime returns, and the single most common
        lifetime outcome, rounded to the nearest 5%, was <strong>a loss of 100%</strong>. Just 4%
        of firms account for all of the net wealth the stock market ever created above T-bills.
        His 2023 update through 2022 puts the share of stocks that reduced shareholder wealth at
        58.6%.
      </Callout>
      <Callout tone="note" label="Why an average this good hides a median this bad">
        Volatility drag: a stock that falls 40% needs a 67% gain to get even, so big swings eat
        compound growth. With the same 8% average, the 40%-swing stock has a median growth rate
        near zero while the 20%-swing index compounds near 6%. The market&rsquo;s return is not
        the typical stock&rsquo;s return; it is the winners&rsquo; return, and diversification is
        how you make sure you own them.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function MathView() {
  return (
    <>
      <StepHeader
        title="Why the risk falls, and where it stops"
        hint="Two formulas: one for independent bets like coins, one for stocks that move together."
      />
      <FormulaBlock
        tex={`\\sigma_p \\;=\\; \\frac{\\sigma}{\\sqrt{n}}`}
        caption="Independent bets: σ is the swing of one play, σₚ the swing of a stake split evenly across n independent plays. Four coins halve the risk; a hundred coins cut it by ten. This is the coin game, and it goes to zero as n grows."
      />
      <FormulaBlock
        tex={`\\sigma_p \\;=\\; \\sigma\\sqrt{\\,\\rho + \\frac{1-\\rho}{n}\\,}`}
        caption="Correlated stocks: with average pairwise correlation ρ, only the (1 − ρ) share of the variance divides away as stocks are added. The 1/n term vanishes for large n; ρ does not."
      />
      <FormulaBlock
        tex={`\\sigma\\sqrt{\\rho} \\;=\\; ${Math.round(SINGLE_STOCK_SD * 100)}\\% \\times \\sqrt{${RHO}} \\;=\\; ${Math.round(SINGLE_STOCK_SD * Math.sqrt(RHO) * 100)}\\%`}
        caption="What remains when n is large: systematic risk, the swing of the market itself. Idiosyncratic, company-specific risk is free to remove; this part is the price of being in the market at all, and it is exactly the S&P 500's typical swing."
        muted
      />
      <Callout tone="note" label="Check it yourself">
        Set the portfolio to one stock and the two curves agree at{' '}
        {formatPercent(SINGLE_STOCK_SD, 0)}. By ten stocks the real curve has already given up most
        of what it will ever give up: diversification is cheap at the start and stingy after that,
        which is why owning three or four stocks is not close to owning the market.
      </Callout>
    </>
  )
}
