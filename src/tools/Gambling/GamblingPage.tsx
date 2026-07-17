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
  computeAhead,
  computeRealPaths,
  type GameKey,
} from './compute'
import { AheadChart } from './components/AheadChart'
import { MoneyPathChart } from './components/MoneyPathChart'
import { OddsChart } from './components/OddsChart'
import { StocksBondsContent } from './StocksBondsPage'
import styles from './GamblingPage.module.css'

type Surface = 'overview' | 'odds' | 'history' | 'research' | 'math'

const TABS: TabItem<Surface>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'odds', label: 'Know the odds' },
  { value: 'history', label: 'Stocks vs. bonds' },
  { value: 'research', label: 'What the research says' },
  { value: 'math', label: 'The math' },
]

const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'

const DEFAULTS = { weekly: 20, startYear: 2006, game: 'lottery' as GameKey }

export function GamblingPage() {
  const [surface, setSurface] = useState<Surface>('overview')
  const [weekly, setWeekly] = useState(DEFAULTS.weekly)
  const [startYear, setStartYear] = useState(DEFAULTS.startYear)
  const [game, setGame] = useState<GameKey>(DEFAULTS.game)

  const reset = () => {
    setWeekly(DEFAULTS.weekly)
    setStartYear(DEFAULTS.startYear)
    setGame(DEFAULTS.game)
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Lesson · Gambling vs. investing</p>
        <h1 className={styles.h1}>The same dollar, two different games</h1>
        <p className={styles.lead}>
          A lottery ticket, a parlay, and an index fund all put money at risk. The difference is
          the direction of the odds. A gamble has a negative expected value: the longer you play,
          the more certainly you lose. A diversified investment has a positive expected value: the
          longer you hold, the more certainly you gain. This lesson makes both halves of that
          sentence precise.
        </p>
      </header>

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
            onChange={setStartYear}
            min={SPY_FIRST_YEAR}
            max={SPY_LAST_START}
            step={1}
            readout={`January ${startYear}`}
            note={`Runs on actual market history through ${SPY_END_LABEL}.`}
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
          {surface === 'overview' && <Overview weekly={weekly} startYear={startYear} game={game} />}
          {surface === 'odds' && <KnowTheOdds />}
          {surface === 'history' && <StocksBondsContent figure="Figure 4." />}
          {surface === 'research' && <ResearchView />}
          {surface === 'math' && <MathView />}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Overview({ weekly, startYear, game }: { weekly: number; startYear: number; game: GameKey }) {
  const { points: paths, years } = useMemo(
    () => computeRealPaths(weekly, startYear, game),
    [weekly, startYear, game]
  )
  const ahead = useMemo(() => computeAhead(years), [years])

  const end = paths[paths.length - 1]!
  const loss = end.staked - end.pocket
  const endAhead = ahead[ahead.length - 1]!
  const gameLabel = GAMES[game].label
  const gameShort = GAMES[game].short

  const crashYears = [2008, 2020, 2022].filter((y) => y >= startYear)
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
        hint="A literal comparison: the same dollars into the game or into SPY, on actual market history."
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
          note={`actual returns, ${startYear} to today, dividends reinvested`}
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
        caption={`${formatUSDWhole(weekly)} a week since January ${startYear} is ${formatUSDWhole(end.staked)} (grey). Spent on ${gameShort}, its expected value melts to ${formatUSDWhole(end.pocket)} (red dashed). Put into SPY, the S&P 500 ETF, it actually grew to ${formatUSDWhole(end.invested)} (green)${crashNote}.`}
      />

      <StepHeader
        title="But somebody always wins, right?"
        hint="Averages hide luck, so ask the sharper question: what is the chance you are ahead at all?"
      />
      <AheadChart
        points={ahead}
        exportStats={[
          { label: `Bettor ahead after ${years} yr`, value: formatPercent(endAhead.bettor, endAhead.bettor < 0.01 ? 2 : 0), color: CARDINAL },
          { label: `Investor ahead after ${years} yr`, value: formatPercent(endAhead.investor, 0), color: GREEN },
        ]}
        caption={`The chance of being ahead of your money. Red: one standard sports bet every week at typical odds with no special skill, the friendliest odds of the three wagers compared here. Green: a diversified index fund bought and held, with an 8% average return and yearly swings of about 20%. After ${years} years the bettor is ahead ${formatPercent(endAhead.bettor, endAhead.bettor < 0.01 ? 2 : 0)} of the time and the investor ${formatPercent(endAhead.investor, 0)} of the time.`}
      />

      <Callout tone="mark" label="The law of large numbers cuts both ways">
        Repetition does not rescue a losing bet; it seals the loss. The same canceling of ups and
        downs that makes a diversified portfolio steadier every year makes a repeated gamble more
        certain to end behind. It is the identical mathematics behind the One Stock or the Fund
        lesson, pointed in the opposite direction.
      </Callout>
      <Callout tone="note" label="This is a price tag, not a sermon">
        Nothing here says never buy a ticket. It says know what the ticket costs: entertainment
        with a negative expected value. The trouble starts when a gamble is mistaken for a plan,
        because the plan role is already taken, and taken by something with the odds pointed the
        right way.
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
        hint="Expected amount returned per $1 staked, at typical published odds. Everything below the line keeps a cut."
      />
      <OddsChart
        exportStats={[
          { label: 'Best gamble in the list', value: 'blackjack, 99.5¢', color: CARDINAL },
          { label: 'Worst in the list', value: 'jackpot draws, about 50¢', color: CARDINAL },
          { label: 'Index fund, average year', value: '$1.08', color: GREEN },
        ]}
        caption="Every gamble returns less than the dollar that goes in; the differences are just the size of the house's cut. An index fund's average year is on the other side of the line, and it is the only entry that compounds."
      />
      <Callout tone="mark" label="Parlays: the edge multiplies">
        A single sports bet gives up about 4.5%. Chain four legs into a parlay and the book takes
        its cut on every leg, which is how sportsbooks report keeping 20¢ or more of every parlay
        dollar. The exciting bets young bettors see advertised are systematically the worst ones on
        the menu.
      </Callout>
      <Callout tone="note" label="Two more quiet subtractions">
        Jackpot figures advertise the annuity value before taxes: a lump-sum winner keeps roughly
        half the headline number after federal and state income tax, which the Understanding Taxes
        lesson can make concrete. And casino paybacks assume flawless play; casual blackjack gives
        up another point or two to the table minimum and hunches.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

/*
 * Every figure below was verified against primary sources in July 2026:
 * - Baker, Balthrop, Johnson, Kotter & Pisciotta, "Gambling Away
 *   Stability" (NBER WP 33108, 2024; R&R at the Journal of Financial
 *   Economics): net investment -14% (~$53/quarter); ~$0.99 less invested
 *   per $1 bet (2SLS); constrained bettors' card balances +$368 (~8%).
 * - Hollenbeck, Larsen & Proserpio, "The Financial Consequences of
 *   Legalized Sports Gambling" (ACM EC '25; April 2025 revision): online
 *   legalization cuts credit scores ~2.75 points, bankruptcies +~10%,
 *   collections +8%. Use the 2025 revision's numbers, not the larger
 *   2024-media figures.
 * - Barber, Huang, Odean & Schwarz (Journal of Finance, 2022): Robinhood
 *   herding, -4.7% abnormal over 20 days; -19.6% for the 45 most extreme
 *   episodes; Massachusetts $7.5M gamification settlement (2024).
 * - Scale: AGA 2025 handle $166.9B; Pew (Oct 2025) 31% of adults under
 *   30 bet on sports in the past year; Kalshi+Polymarket $44.8B volume
 *   in June 2026, ~87% of Kalshi volume is sports (CRS, March 2026);
 *   CFTC proposed rule June 2026.
 */
function ResearchView() {
  return (
    <>
      <StepHeader
        title="This is no longer hypothetical"
        hint="Legal sports betting is eight years old. The first careful studies of what it does to household finances are in."
      />
      <div className={styles.stats}>
        <Stat
          label="Legal U.S. sports bets, 2025"
          value={167}
          format={(v) => `$${Math.round(v)}B`}
          emphasis
          accentColor={CARDINAL}
          animate={false}
          note="across about 39 states, from zero in 2018"
        />
        <Stat
          label="Adults under 30 who bet on sports"
          value={0.31}
          format={(v) => formatPercent(v, 0)}
          animate={false}
          note="in the past year (Pew, 2025); 36% of men under 30"
        />
        <Stat
          label="Invested less, per dollar bet"
          value={0.99}
          format={(v) => `$${v.toFixed(2)}`}
          accentColor={CARDINAL}
          animate={false}
          note="betting crowds out brokerage deposits almost one for one"
        />
      </div>

      <Callout tone="mark" label="Betting money is investing money, redirected">
        Following hundreds of thousands of households before and after their state legalized
        online sports betting, Baker, Balthrop, Johnson, Kotter, and Pisciotta find net brokerage
        investment falls about <strong>14%</strong>, roughly a dollar less invested for every
        dollar bet. The strain lands hardest on households already stretched thin: bettors with
        low savings cut investing about three times as much, carry roughly{' '}
        <strong>8% higher credit card balances</strong>, and overdraft more often.
      </Callout>
      <Callout tone="mark" label="It shows up on credit reports">
        Hollenbeck, Larsen, and Proserpio track millions of credit files: states that legalize{' '}
        <strong>online</strong> sports betting see average credit scores slip about 3 points,
        bankruptcies rise roughly <strong>10%</strong>, and debt in collections rise about 8%,
        with the effects arriving about two years after launch and concentrated among young,
        lower-income men, exactly who your students are about to be.
      </Callout>
      <Callout tone="note" label="The stock market can be played like a sportsbook">
        Barber, Huang, Odean, and Schwarz (Journal of Finance, 2022) studied Robinhood&rsquo;s
        design: when its users herded into the day&rsquo;s most attention-grabbing stocks, those
        stocks went on to lose about <strong>4.7% over the next 20 days</strong>, and nearly 20%
        after the most extreme episodes. Massachusetts fined Robinhood $7.5 million over the
        game-like features involved. The lesson for students: an app can make negative expected
        value feel like investing.
      </Callout>
      <Callout tone="note" label="The newest wrapper: prediction markets">
        Kalshi and Polymarket traded about <strong>$45 billion in June 2026 alone</strong>, and
        roughly nine of every ten of those dollars were bets on sports, running through a
        federally regulated exchange rather than a state sportsbook. Regulators are still
        catching up: the CFTC proposed its first real limits in June 2026. There is no
        peer-reviewed evidence yet on what these do to households; the honest classroom framing
        is that the odds structure is the sportsbook&rsquo;s, in a brokerage costume.
      </Callout>
      <p className={styles.footnote}>
        Sources: Baker, Balthrop, Johnson, Kotter, and Pisciotta, Gambling Away Stability, NBER
        Working Paper 33108 (2024). Hollenbeck, Larsen, and Proserpio, The Financial Consequences
        of Legalized Sports Gambling, ACM EC &rsquo;25 (April 2025 revision). Barber, Huang,
        Odean, and Schwarz, Attention-Induced Trading and Returns, Journal of Finance 77(6),
        2022. American Gaming Association 2025 revenue tracker; Pew Research Center, October
        2025; Congressional Research Service IF13187, March 2026. Figures verified July 2026.
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */

function MathView() {
  return (
    <>
      <StepHeader
        title="Expected value, in three lines"
        hint="One definition and two worked examples carry the whole lesson."
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
        caption="Lotteries publish prize payouts near 65% of sales, so the expected value of a $1 ticket is about negative 35 cents. No pattern of numbers, store, or streak changes it."
        muted
      />
      <FormulaBlock
        tex={`\\bar{X}_n \\;\\longrightarrow\\; \\mathbb{E}[X] \\quad \\text{as plays pile up}`}
        caption="The law of large numbers: the average result per play converges to the expected value as plays pile up. Negative expected value plus repetition equals near-certain loss; positive expected value plus patience equals near-certain gain. Time is the gambler's enemy and the investor's ally."
      />
      <Callout tone="note" label="Why the investor's odds improve">
        A diversified index fund is a positive expected value bet whose yearly ups and downs partly
        cancel over time, the diversification argument applied across years instead of across
        stocks. The 8% average and yearly swings of about 20% behind the chance-of-being-ahead model are similar
        to the assumptions in the One Stock or the Fund lesson; the U.S. market has finished a calendar
        year higher roughly three times out of four.
      </Callout>
    </>
  )
}
