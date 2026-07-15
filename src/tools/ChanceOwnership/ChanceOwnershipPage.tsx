import { useEffect, useMemo, useState } from 'react'
import { Button, Callout, Card, SegmentedControl, Slider, Stat } from '../../design-system'
import { formatPercent, formatUSDWhole } from '../../lib/format'
import { CHEAP_FEE, DEFAULT_RETURN_PCT, PICK_YEARS, buildFeeSeries, generateTickets, simulateBettors } from './compute'
import { StationChart } from './components/StationChart'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Chance & Ownership: a three-station classroom simulator built for the
 * teacher training institute. The house (casino games, sports bets, and
 * prediction markets), stock picker, index fund. Every station asks the
 * same two questions: what happens to a thousand people who keep playing,
 * and does the thing you bought own anything?
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'

const fmtSignedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString()}%`

/* --------------------------- spectrum rail ------------------------ */

type StationKey = 'book' | 'pick' | 'index'

const STATIONS: { id: StationKey; n: string; title: string; ev: string; negative: boolean; pos: number }[] = [
  { id: 'book', n: 'I', title: 'The House', ev: '−$1 to −$25 per $100, depending on the game', negative: true, pos: 6 },
  { id: 'pick', n: 'II', title: 'The Stock Picker', ev: 'positive, with a wide spread', negative: false, pos: 66 },
  { id: 'index', n: 'III', title: 'The Index Fund', ev: 'about +$7 per $100, per year held', negative: false, pos: 94 },
]

function Rail({ active, onChange }: { active: StationKey; onChange: (s: StationKey) => void }) {
  const st = STATIONS.find((s) => s.id === active)!
  return (
    <div className={styles.rail}>
      <div className={styles.railTrack}>
        <div className={styles.railGradient} />
        <div className={styles.railMidline} />
        {STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={active === s.id ? `${styles.railDot} ${styles.railDotActive}` : styles.railDot}
            style={{ left: `${s.pos}%` }}
            onClick={() => onChange(s.id)}
            aria-label={`Station ${s.n}: ${s.title}`}
            aria-pressed={active === s.id}
          />
        ))}
      </div>
      <div className={styles.railLabels}>
        <span className={styles.railLoss}>Pure chance · the house takes a cut</span>
        <span className={styles.railQuestion}>the line: does it own anything?</span>
        <span className={styles.railGain}>Ownership · production pays you</span>
      </div>
      <div className={styles.railTitle}>
        <h2 className={styles.stationTitle}>
          <span className={styles.stationNumeral}>{st.n}.</span>
          {st.title}
        </h2>
        <span className={st.negative ? `${styles.stationEv} ${styles.evNegative}` : `${styles.stationEv} ${styles.evPositive}`}>
          expected value: {st.ev}
        </span>
      </div>
    </div>
  )
}

/* ----------------------------- station I -------------------------- */

type BetType = 'blackjack' | 'straight' | 'parlay' | 'pm'

const BET_PARAMS: Record<BetType, { winProb: number; winMult: number; feeOnWin: number; label: string }> = {
  blackjack: {
    winProb: 0.495,
    winMult: 1,
    feeOnWin: 0,
    label: 'Blackjack with basic strategy · about a 1% house edge (simplified even-money hands)',
  },
  straight: { winProb: 0.5, winMult: 100 / 110, feeOnWin: 0, label: 'Straight bet at −110 · about a 4.5% house edge' },
  parlay: { winProb: 0.125, winMult: 5, feeOnWin: 0, label: 'Same-game parlay · about a 25% effective house edge' },
  pm: {
    winProb: 0.5,
    winMult: 1,
    // Kalshi taker fee: 7¢ × price × (1 − price) per contract. At 50¢ that is
    // 1.75¢ on a 50¢ stake, ~3.5% of money wagered per trade.
    feeOnWin: 0.07,
    label: 'Prediction market on 50/50 games · about a 3.5% cost per trade at mid prices',
  },
}

function BettingStation() {
  const [betType, setBetType] = useState<BetType>('straight')
  const isPM = betType === 'pm'
  const [start, setStart] = useState(1000)
  const [stake, setStake] = useState(25)
  const [bets, setBets] = useState(200)
  const [seed, setSeed] = useState(1)

  const params = BET_PARAMS[betType]

  const sim = useMemo(
    () => simulateBettors({ n: 1000, bets, stake, start, seed: seed * 13 + bets, ...params }),
    [bets, stake, start, seed, params]
  )

  // Comparison line for the prediction market: a sportsbook straight bet on the same settings.
  const compare = useMemo(
    () =>
      isPM
        ? simulateBettors({ n: 1000, bets, stake, start, seed: seed * 13 + bets, winProb: 0.5, winMult: 100 / 110, feeOnWin: 0 })
        : null,
    [isPM, bets, stake, start, seed]
  )

  const yMax = Math.max(sim.p90[sim.p90.length - 1]! * 1.1, sim.start * 1.6)
  const lineColor = RED

  const insight = isPM ? (
    <Callout tone="mark" label="Zero-sum, minus fees">
      An event contract has no house on the other side: one trader's gain is another trader's loss,
      less the exchange's fee. That fee looks tiny (at most 1.75¢ per $1 contract), but measured
      against the money wagered, a market order near 50¢ gives up about 3.5% per trade, not far
      below the sportsbook's 4.5%. The exchange collects it on every trade, and the product is
      built to produce many trades.
    </Callout>
  ) : betType === 'blackjack' ? (
    <Callout tone="mark" label="Skill changes the rate, not the direction">
      Basic strategy reduces the house edge to about 1%, the smallest of any common casino game. The
      expected value of each hand is still negative, so the median player still loses; the loss
      simply accumulates more slowly.
    </Callout>
  ) : betType === 'parlay' ? (
    <Callout tone="mark" label="Why parlays cost more">
      A same-game parlay applies the sportsbook's margin to every leg, compounding it into an
      effective edge near 25%. Compare the band here with the straight bet: the distribution of
      outcomes shifts toward loss much faster per bet placed.
    </Callout>
  ) : (
    <Callout tone="mark" label="The law of large numbers">
      Any single player's result is dominated by luck, which is why the band is wide. The group's
      result is arithmetic: with a negative expected value per bet, the average bankroll falls as
      bets accumulate, and the spread of likely outcomes concentrates around that falling average.
    </Callout>
  )

  return (
    <div className={styles.stationStack}>
      <p className={styles.stationLede}>
        {isPM
          ? `1,000 simulated traders each start with ${formatUSDWhole(start)} and trade event contracts on 50/50 games against each other. Choose the game to change the house edge.`
          : `1,000 simulated players each start with ${formatUSDWhole(start)} and bet repeatedly against the house. Choose the game to change the house edge.`}
      </p>
      <div className={styles.gameRow}>
        <SegmentedControl
          label="The game"
          options={[
            { value: 'blackjack', label: 'Blackjack' },
            { value: 'straight', label: 'Straight (−110)' },
            { value: 'parlay', label: 'Parlay' },
            { value: 'pm', label: 'Prediction market' },
          ]}
          value={betType}
          onChange={setBetType}
        />
        <Button onClick={() => setSeed((s) => s + 1)}>Re-run 1,000 players</Button>
      </div>
      <div className={styles.slidersRow}>
        <Slider label="Starting amount" value={start} onChange={setStart} min={100} max={10000} step={100} editable prefix="$" />
        <Slider label="Bet size" value={stake} onChange={setStake} min={1} max={500} step={1} editable prefix="$" />
        <Slider label="Number of bets" value={bets} onChange={setBets} min={10} max={1000} step={10} editable inputMax={10000} />
      </div>
      <div className={styles.stats}>
        <Stat
          label="Still ahead"
          value={sim.ahead}
          format={(v) => formatPercent(v, 0)}
          accentColor={sim.ahead < 0.4 ? RED : undefined}
          animate={false}
        />
        <Stat
          label="Typical player has"
          value={sim.medFinal}
          format={formatUSDWhole}
          accentColor={sim.medFinal < sim.start ? RED : GREEN}
          animate={false}
        />
        <Stat
          label={`Lost the full ${formatUSDWhole(start)}`}
          value={sim.busted}
          format={(v) => formatPercent(v, 0)}
          accentColor={sim.busted > 0.05 ? RED : undefined}
          animate={false}
        />
      </div>

      <div className={styles.chartCol}>
        <div className={styles.legend}>
          <span style={{ color: lineColor }}>&#9632; typical player</span>
          <span style={{ color: 'var(--text-muted)' }}>&#9617; middle 80% of players</span>
          {isPM && <span style={{ color: SLATE }}>&#9476; typical sportsbook bettor, same bets</span>}
          <span style={{ color: 'var(--text-muted)' }}>&#9476; starting {formatUSDWhole(start)}</span>
        </div>
        <StationChart
          x={sim.x}
          yMax={yMax}
          yRef={sim.start}
          refLabel={`starting ${formatUSDWhole(start)}`}
          band={{ upper: sim.p90, lower: sim.p10, color: lineColor }}
          bandLabels={{ upper: '90th percentile player', lower: '10th percentile player' }}
          lines={[
            ...(compare
              ? [{ ys: compare.median, color: SLATE, width: 2, dashed: true, label: 'Sportsbook median, same bets' }]
              : []),
            { ys: sim.median, color: lineColor, width: 3, label: 'Typical player (median)' },
          ]}
          xTickFormat={(v) => `${Math.round(v)} bets`}
          xHoverLabel={(v) => (isPM ? `After ${Math.round(v)} trades` : `After ${Math.round(v)} bets`)}
          ratio={0.42}
          maxHeight={520}
          figure="Figure 1."
          caption={`${params.label}. The shaded band holds the middle 80% of 1,000 simulated players; the bold line is the median player.`}
          ariaLabel={
            isPM
              ? 'Bankrolls of 1,000 simulated prediction market traders over repeated trades'
              : 'Bankrolls of 1,000 simulated bettors over repeated bets'
          }
          exportStats={[
            { label: 'Still ahead', value: formatPercent(sim.ahead, 0), color: sim.ahead < 0.4 ? RED : undefined },
            { label: 'Typical player has', value: formatUSDWhole(sim.medFinal), color: sim.medFinal < sim.start ? RED : GREEN },
            { label: `Lost the full ${formatUSDWhole(start)}`, value: formatPercent(sim.busted, 0) },
          ]}
        />
        {insight}
      </div>
    </div>
  )
}

/* --------------------------- station II --------------------------- */

function ReturnBars({ ticket, sp }: { ticket: { r1: number; r5: number; r10: number }; sp: { r1: number; r5: number; r10: number } }) {
  const rows = [
    { h: '1 year', s: ticket.r1, m: sp.r1 },
    { h: '5 years', s: ticket.r5, m: sp.r5 },
    { h: '10 years', s: ticket.r10, m: sp.r10 },
  ]
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.s), Math.abs(r.m)]), 50)
  const barW = (v: number) => Math.max(2, (Math.abs(v) / maxAbs) * 100)

  return (
    <div className={styles.returnRows}>
      {rows.map((r) => {
        const beat = r.s > r.m
        return (
          <div key={r.h}>
            <div className={styles.returnHead}>
              <span className={styles.returnHorizon}>{r.h}</span>
              <span className={styles.returnVerdict} style={{ color: beat ? GREEN : RED }}>
                {beat ? 'beat the index' : 'lost to the index'}
              </span>
            </div>
            {[
              { label: 'your pick', v: r.s, color: r.s >= 0 ? GREEN : RED, bold: true },
              { label: 'S&P 500', v: r.m, color: SLATE, bold: false },
            ].map((b) => (
              <div key={b.label} className={styles.returnBarRow}>
                <span className={styles.returnBarLabel}>{b.label}</span>
                <div className={styles.returnBarTrack}>
                  <div
                    className={styles.returnBarFill}
                    style={{ width: `${barW(b.v)}%`, background: b.color, opacity: b.bold ? 1 : 0.45 }}
                  />
                </div>
                <span className={`${styles.returnBarValue} tnum`} style={{ color: b.color }}>
                  {fmtSignedPct(b.v)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function StockPicker() {
  const [year, setYear] = useState(2000)
  const [pick, setPick] = useState<number | null>(null)
  const [draw, setDraw] = useState(1)
  const data = PICK_YEARS[year]!
  const tickets = useMemo(() => generateTickets(year, draw), [year, draw])
  const committed = pick !== null
  const beat = tickets.filter((t) => t.r10 > data.sp.r10).length
  const medianR10 = [...tickets].map((t) => t.r10).sort((a, b) => a - b)[50]!
  const best = Math.max(...tickets.map((t) => t.r10))

  useEffect(() => setPick(null), [year, draw])

  return (
    <div>
      <div className={styles.pickerHeader}>
        <SegmentedControl
          label="It is January of"
          options={Object.keys(PICK_YEARS).map((y) => ({ value: y, label: y }))}
          value={String(year)}
          onChange={(y) => setYear(Number(y))}
        />
        <p className={styles.pickerNote}>{data.note}</p>
      </div>

      <p className={styles.stationLede}>
        The board holds <strong>100 stocks, ranked by market cap</strong>, with no names or tickers
        shown. Choose one ticket and commit $1,000 to it, then compare its next decade against the
        index.
      </p>

      <div className={styles.indexStrip}>
        <span className={styles.indexStripLabel}>The index (S&amp;P 500) from January {year}:</span>
        {[
          { h: '1 year', v: data.sp.r1 },
          { h: '5 years', v: data.sp.r5 },
          { h: '10 years', v: data.sp.r10 },
        ].map((r) => (
          <span key={r.h} className={styles.indexStripItem}>
            {r.h}{' '}
            <strong className="tnum" style={{ color: r.v >= 0 ? GREEN : RED }}>
              {fmtSignedPct(r.v)}
            </strong>
          </span>
        ))}
      </div>

      <div className={styles.stationGrid}>
        <div className={styles.boardCol}>
          <div className={styles.board}>
            {tickets.map((t, i) => {
              const selected = pick === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!committed) setPick(i)
                  }}
                  title={committed ? undefined : `#${i + 1} · ${t.cap}`}
                  className={[
                    styles.ticket,
                    selected ? styles.ticketSelected : '',
                    committed && !selected ? styles.ticketDimmed : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className={styles.boardScale}>
            <span>#1 · largest ({tickets[0]!.cap})</span>
            <span>#100 · smallest ({tickets[99]!.cap})</span>
          </div>
        </div>

        <div className={styles.resultCol}>
          {!committed ? (
            <div className={styles.pickPrompt}>
              Select a ticket to commit. The board then reveals how your pick performed against the
              index over the following decade, and how many of the 100 beat it.
            </div>
          ) : (
            <Card tone="raised" className={styles.pickResult}>
              <p className={styles.pickResultTitle}>
                Ticket <span className={styles.pickResultNumber}>#{pick! + 1}</span> ({tickets[pick!]!.cap}),
                bought January {year}
              </p>
              <ReturnBars ticket={tickets[pick!]!} sp={data.sp} />
              <Button variant="quiet" size="sm" onClick={() => setDraw((d) => d + 1)}>
                New board, draw again
              </Button>
            </Card>
          )}
        </div>
      </div>

      {committed && (
        <>
          <div className={styles.stats}>
            <Stat
              label="Tickets that beat the index (10 yr)"
              value={beat}
              format={(v) => `${Math.round(v)} of 100`}
              accentColor={beat < 50 ? RED : GREEN}
              animate={false}
            />
            <Stat
              label="Typical ticket (10 yr)"
              value={medianR10}
              format={fmtSignedPct}
              accentColor={medianR10 < data.sp.r10 ? RED : GREEN}
              animate={false}
            />
            <Stat label="Best ticket on the board (10 yr)" value={best} format={fmtSignedPct} accentColor={GREEN} animate={false} />
          </div>
          <Callout tone="mark" label="Most stocks trail their own index">
            The index's average return is pulled up by a small number of extreme winners, so the
            typical individual stock underperforms the index over a decade even while the market as a
            whole gains. A single pick usually misses the winners; holding the index guarantees owning
            them, whichever stocks they turn out to be.
          </Callout>
        </>
      )}

      <p className={styles.footnote}>
        Index returns are actual approximate S&amp;P 500 price returns from January of each year.
        Individual tickets are simulated from the real statistical distribution of single-stock
        outcomes: most stocks lag the index, and a small minority create most of the excess wealth.
        For classroom illustration only.
      </p>
    </div>
  )
}

/* --------------------------- station III -------------------------- */

function IndexFund() {
  const [monthly, setMonthly] = useState(100)
  const [years, setYears] = useState(30)
  const [fee, setFee] = useState(1.0)
  const [ret, setRet] = useState(DEFAULT_RETURN_PCT)

  const series = useMemo(() => buildFeeSeries(monthly, years, fee, ret), [monthly, years, fee, ret])

  const contributed = monthly * 12 * years
  const cheapFinal = series.cheap[series.cheap.length - 1]!
  const costlyFinal = series.costly[series.costly.length - 1]!
  const yMax = cheapFinal * 1.1

  return (
    <div className={styles.stationGrid}>
      <div className={styles.controlsCol}>
        <p className={styles.stationLede}>
          The same monthly amount goes into a fund holding all 500 companies and compounds over
          decades. The remaining variable is the fund's <strong>expense ratio</strong>.
        </p>
        <Slider
          label="Invested per month"
          value={monthly}
          onChange={setMonthly}
          min={25}
          max={500}
          step={25}
          readout={formatUSDWhole(monthly)}
        />
        <Slider label="Years" value={years} onChange={setYears} min={10} max={45} step={1} readout={`${years}`} />
        <Slider
          label="Average yearly return"
          value={ret}
          onChange={setRet}
          min={3}
          max={12}
          step={0.5}
          readout={`${ret.toFixed(1)}%`}
        />
        <Slider
          label="Fund expense ratio"
          value={fee}
          onChange={setFee}
          min={0.1}
          max={2}
          step={0.05}
          readout={`${fee.toFixed(2)}%`}
        />
        <div className={styles.statsColumn}>
          <Stat
            label={`Index ETF at ${CHEAP_FEE.toFixed(2)}%, after ${years} years`}
            value={cheapFinal}
            format={formatUSDWhole}
            accentColor={GREEN}
            emphasis
            animate={false}
          />
          <Stat label={`The same fund at ${fee.toFixed(2)}%`} value={costlyFinal} format={formatUSDWhole} animate={false} />
          <Stat
            label="Eaten by the higher fee"
            value={cheapFinal - costlyFinal}
            format={formatUSDWhole}
            accentColor={RED}
            animate={false}
          />
        </div>
      </div>
      <div className={styles.chartCol}>
        <div className={styles.legend}>
          <span style={{ color: GREEN }}>&#9632; {CHEAP_FEE.toFixed(2)}% expense ratio</span>
          <span style={{ color: GOLD }}>&#9632; {fee.toFixed(2)}% expense ratio</span>
          <span style={{ color: 'var(--text-muted)' }}>&#9476; total contributed</span>
        </div>
        <StationChart
          x={series.x}
          yMax={yMax}
          yRef={contributed}
          refLabel="total contributed"
          lines={[
            { ys: series.costly, color: GOLD, width: 2.5, label: `At ${fee.toFixed(2)}% expense ratio` },
            { ys: series.cheap, color: GREEN, width: 3, label: `At ${CHEAP_FEE.toFixed(2)}% expense ratio` },
          ]}
          extraHover={[{ label: 'Contributed so far', ys: series.x.map((t) => monthly * 12 * t) }]}
          xTickFormat={(v) => `${Math.round(v)} yr`}
          xHoverLabel={(v) => `Year ${Math.round(v)}`}
          figure="Figure 2."
          caption={`The same ${formatUSDWhole(monthly)} a month at a ${ret.toFixed(1)}% average yearly return, held steady for illustration. Real markets swing; the average only shows up if you stay in.`}
          ariaLabel="Growth of a monthly index fund habit at two expense ratios"
          exportStats={[
            { label: `At ${CHEAP_FEE.toFixed(2)}%`, value: formatUSDWhole(cheapFinal), color: GREEN },
            { label: `At ${fee.toFixed(2)}%`, value: formatUSDWhole(costlyFinal), color: GOLD },
            { label: 'Eaten by the higher fee', value: formatUSDWhole(cheapFinal - costlyFinal), color: RED },
          ]}
        />
        <Callout tone="mark" label="Fees compound like returns">
          Both lines hold the same asset for the same {years} years; only the expense ratio differs.
          An annual fee compounds against the balance the same way a return compounds for it, which is
          why the gap between the lines widens with time.
        </Callout>
      </div>
    </div>
  )
}

/* ------------------------------ page ------------------------------ */

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function ChanceOwnershipPage({ intro = true }: { intro?: boolean } = {}) {
  const [active, setActive] = useState<StationKey>('book')

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Gambling vs. investing</p>
          <h1 className={styles.h1}>Chance &amp; Ownership</h1>
          <p className={styles.lead}>
            Three stations trace the path from a sports bet to an index fund. Each one asks the same two
            questions: what happens to a thousand people who keep playing, and does what you bought own
            anything?
          </p>
        </header>
      )}

      <Rail active={active} onChange={setActive} />

      <Card tone="raised" className={styles.panel}>
        {active === 'book' && <BettingStation />}
        {active === 'pick' && <StockPicker />}
        {active === 'index' && <IndexFund />}
      </Card>

      <p className={styles.footnote}>
        Simplified simulations for classroom discussion, not financial data or advice. Betting
        simulations assume 50/50 games at typical published odds and fees; market figures are approximate
        historical price returns.
      </p>
    </div>
  )
}
