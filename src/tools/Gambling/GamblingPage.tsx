import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  SegmentedControl,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole } from '../../lib/format'
import {
  GAMES,
  SPY_END_LABEL,
  SPY_FIRST_YEAR,
  SPY_LAST_START,
  SPY_LAST_YEAR,
  computeAhead,
  computeRealPaths,
  endLabelFor,
  type GameKey,
} from './compute'
import { AheadChart } from './components/AheadChart'
import { MoneyPathChart } from './components/MoneyPathChart'
import { OddsChart } from './components/OddsChart'
import styles from './GamblingPage.module.css'

type Surface = 'overview' | 'odds' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'odds', label: 'Know the odds' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'

/* 2018 is the default start: in May of that year the Supreme Court struck
   down the federal ban on sports betting, and the states began legalising it. */
const DEFAULTS = { weekly: 20, startYear: 2018, endYear: SPY_LAST_YEAR, game: 'lottery' as GameKey }

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function GamblingPage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('overview')
  const [weekly, setWeekly] = useState(DEFAULTS.weekly)
  const [startYear, setStartYear] = useState(DEFAULTS.startYear)
  const [endYear, setEndYear] = useState(DEFAULTS.endYear)
  const [game, setGame] = useState<GameKey>(DEFAULTS.game)

  /* Keep at least one full year between the start and the end. */
  const pickStart = (y: number) => {
    setStartYear(y)
    if (endYear <= y) setEndYear(y + 1)
  }

  const reset = () => {
    setWeekly(DEFAULTS.weekly)
    setStartYear(DEFAULTS.startYear)
    setEndYear(DEFAULTS.endYear)
    setGame(DEFAULTS.game)
  }

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Gambling vs. investing</p>
          <h1 className={styles.h1}>Gambling and investing compared</h1>
          <p className={styles.lead}>
            A lottery ticket, a parlay, and an index fund all put money at risk. A gamble has a
            negative expected value; a diversified fund has a positive one. This lesson runs the
            same weekly amount through both.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.controls}>
        <div className={styles.controlsHeader}>
          <StepHeader title="Pick a habit" hint="The same dollars every week, gambled or invested." />
          <Button variant="quiet" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
        <div className={styles.controlsGrid}>
          <NumberField
            label="Money at stake ($/week)"
            value={weekly}
            onChange={setWeekly}
            min={1}
            max={1000}
            prefix="$"
            precision={0}
          />
          <Slider
            label="Start the habit in"
            value={startYear}
            onChange={pickStart}
            min={SPY_FIRST_YEAR}
            max={SPY_LAST_START}
            step={1}
            readout={`January ${startYear}`}
            note="The default is 2018, when the Supreme Court struck down the federal ban on sports betting and the states began legalizing it. SPY's first full year is 1993."
          />
          <Slider
            label="End the habit in"
            value={endYear}
            onChange={setEndYear}
            min={startYear + 1}
            max={SPY_LAST_YEAR}
            step={1}
            readout={endLabelFor(endYear)}
            note={`Market data through ${SPY_END_LABEL}, refreshed every six months.`}
          />
          <SegmentedControl
            label="The game"
            options={[
              { value: 'lottery', label: 'Lottery tickets' },
              { value: 'sports', label: 'Sports bets' },
              { value: 'slots', label: 'Slot machines' },
            ]}
            value={game}
            onChange={setGame}
          />
        </div>
        <p className={styles.footnote}>
          Payback rates are typical published figures, not adjustable: scratch lotteries return
          about 65¢ of each dollar as prizes, standard sports bets about 95¢, slot machines about
          92¢. The investment is the S&amp;P 500 index with dividends reinvested, what an
          S&amp;P 500 fund like SPY tracks (Shiller data, monthly, through {SPY_END_LABEL}), not
          a modeled average. The weekly habit is applied as its monthly equivalent.
        </p>
      </Card>

      <div className={styles.main}>
        <div className={styles.tabBar}>
          <Tabs items={TABS} value={surface} onChange={setSurface} />
        </div>
        <Card tone="raised" className={styles.panel}>
          {surface === 'overview' && (
            <Overview weekly={weekly} startYear={startYear} endYear={endYear} game={game} />
          )}
          {surface === 'odds' && <KnowTheOdds />}
          {surface === 'math' && <MathView />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Overview({
  weekly,
  startYear,
  endYear,
  game,
}: {
  weekly: number
  startYear: number
  endYear: number
  game: GameKey
}) {
  const { points: paths, years } = useMemo(
    () => computeRealPaths(weekly, startYear, endYear, game),
    [weekly, startYear, endYear, game]
  )
  const ahead = useMemo(() => computeAhead(years), [years])

  const end = paths[paths.length - 1]!
  const loss = end.staked - end.pocket
  const endAhead = ahead[ahead.length - 1]!
  const gameLabel = GAMES[game].label
  const gameShort = GAMES[game].short
  const endText = endLabelFor(endYear)
  const behind = end.invested < end.staked

  const crashYears = [2008, 2020, 2022].filter((y) => y >= startYear && y <= endYear)
  const crashNote =
    crashYears.length === 0
      ? ''
      : crashYears.length === 1
        ? `, the ${crashYears[0]} crash included`
        : `, crashes of ${
            crashYears.length === 2
              ? crashYears.join(' and ')
              : `${crashYears[0]}, ${crashYears[1]}, and ${crashYears[2]}`
          } included`

  return (
    <>
      <StepHeader
        title="Where the weekly money ends up"
        hint="The same dollars into the game or into an S&amp;P 500 fund, on actual market history."
      />
      <div className={styles.stats}>
        <Stat label="Total put in" value={end.staked} format={formatUSDWhole} accentColor={SLATE} />
        <Stat
          label={`Expected pocket, ${gameLabel.toLowerCase()}`}
          value={end.pocket}
          format={formatUSDWhole}
          accentColor={CARDINAL}
          note={`an expected loss of ${formatUSDWhole(loss)}`}
        />
        <Stat
          label="Same money in SPY"
          value={end.invested}
          format={formatUSDWhole}
          emphasis
          accentColor={GREEN}
          note={`actual returns, January ${startYear} to ${endText}, dividends reinvested`}
        />
      </div>

      <MoneyPathChart
        points={paths}
        gameLabel={gameLabel}
        exportStats={[
          { label: 'Total put in', value: formatUSDWhole(end.staked), color: SLATE },
          { label: `Expected pocket, ${gameLabel.toLowerCase()}`, value: formatUSDWhole(end.pocket), color: CARDINAL },
          { label: 'SPY balance', value: formatUSDWhole(end.invested), color: GREEN },
        ]}
        caption={`${formatUSDWhole(weekly)} a week from January ${startYear} to ${endText} is ${formatUSDWhole(end.staked)} (grey). Spent on ${gameShort}, its expected value falls to ${formatUSDWhole(end.pocket)} (red dashed). Put into SPY, the S&P 500 ETF, it actually ${behind ? `shrank to ${formatUSDWhole(end.invested)}` : `grew to ${formatUSDWhole(end.invested)}`} (green)${crashNote}.${behind ? ' This window ends inside a downturn, which is the risk investing carries.' : ''}`}
      />

      <StepHeader
        title="The chance of being ahead"
        hint="The share of players who are ahead of what they put in, year by year."
      />
      <AheadChart
        points={ahead}
        exportStats={[
          { label: `Bettor ahead after ${years} yr`, value: formatPercent(endAhead.bettor, endAhead.bettor < 0.01 ? 2 : 0), color: CARDINAL },
          { label: `Investor ahead after ${years} yr`, value: formatPercent(endAhead.investor, 0), color: GREEN },
        ]}
        caption={`The chance of being ahead of your money. Red: one standard sports bet every week at typical odds with no special skill, the friendliest odds of the three wagers compared here. Green: a diversified index fund bought and held, with an 8% average return and yearly swings of about 20%. After ${years} years the bettor is ahead ${formatPercent(endAhead.bettor, endAhead.bettor < 0.01 ? 2 : 0)} of the time and the investor ${formatPercent(endAhead.investor, 0)} of the time.`}
      />

      <Callout tone="mark" label="The law of large numbers">
        Repeating a bet with a negative expected value makes the loss more certain, not less. The
        same averaging out that steadies a diversified portfolio over the years drives a repeated
        gamble further behind.
      </Callout>
      <Callout tone="note" label="What a ticket costs">
        A lottery ticket or a bet is entertainment with a negative expected value. That is a
        different thing from a way to build savings, which is what a diversified investment does.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function KnowTheOdds() {
  return (
    <>
      <StepHeader
        title="What a dollar buys in each game"
        hint="Expected amount returned per $1 staked, at typical published odds. Every entry below the line keeps part of the dollar."
      />
      <OddsChart
        exportStats={[
          { label: 'Best gamble in the list', value: 'blackjack, 99.5¢', color: CARDINAL },
          { label: 'Worst in the list', value: 'jackpot draws, about 50¢', color: CARDINAL },
          { label: 'Index fund, average year', value: '$1.08', color: GREEN },
        ]}
        caption="Every gamble returns less than the dollar that goes in. The differences between them are the size of the house's cut. An index fund's average year is above the line."
      />
      <Callout tone="mark" label="Parlays compound the house edge">
        A single sports bet gives up about 4.5%. Chain four legs into a parlay and the book takes
        its cut on every leg, which is how sportsbooks report keeping 20¢ or more of every parlay
        dollar. Parlays are also the bets advertised most heavily to young bettors.
      </Callout>
      <Callout tone="note" label="Taxes and imperfect play">
        Jackpot figures advertise the annuity value before taxes. A lump-sum winner keeps roughly
        half the headline number after federal and state income tax. Casino paybacks also assume
        flawless play: casual blackjack gives up another point or two.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */

function MathView() {
  return (
    <>
      <StepHeader
        title="See the math"
        hint="One definition and two worked examples."
      />
      <FormulaBlock
        tex={`\\mathbb{E}[X] \\;=\\; p_1 x_1 + p_2 x_2 + \\cdots + p_k x_k`}
        caption="Expected value: each possible outcome times its probability, summed. It is the average result per play if the same bet were repeated many times."
      />
      <FormulaBlock
        tex={`\\mathbb{E}[\\text{sports bet}] \\;=\\; \\tfrac{1}{2}(+\\$100) + \\tfrac{1}{2}(-\\$110) \\;=\\; -\\$5 \\;\\approx\\; -4.5\\%`}
        caption="The standard line lays $110 to win $100 on both sides. A bettor with no forecasting edge wins half the time, so every $110 staked hands the book $5 on average. The 'vig' is this gap, priced into the odds."
      />
      <FormulaBlock
        tex={`\\mathbb{E}[\\text{scratch ticket}] \\;=\\; 0.65 - 1 \\;=\\; -\\$0.35 \\text{ per dollar}`}
        caption="Lotteries publish prize payouts near 65% of sales, so the expected value of a $1 ticket is about negative 35 cents."
        muted
      />
      <FormulaBlock
        tex={`\\bar{X}_n \\;\\longrightarrow\\; \\mathbb{E}[X] \\quad \\text{as plays pile up}`}
        caption="The law of large numbers: the average result per play converges to the expected value as the number of plays rises. A negative expected value repeated often enough becomes a near-certain loss, and a positive one a near-certain gain."
      />
      <Callout tone="note" label="Why the investor's odds improve with time">
        A diversified index fund has a positive expected value, and its yearly ups and downs partly
        cancel out over a long holding period. The chance-of-being-ahead model uses an 8% average
        return and yearly swings of about 20%. The U.S. market has finished a calendar year higher
        roughly three times out of four.
      </Callout>
    </>
  )
}
