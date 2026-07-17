import { useMemo, useState } from 'react'
import { Button, Callout, Card, SegmentedControl, Slider, Stat } from '../../design-system'
import { formatPercent, formatUSDWhole } from '../../lib/format'
import { simulateBettors } from './compute'
import { StationChart } from './components/StationChart'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Gambling Simulation (formerly the first station of Chance & Ownership):
 * the house. A thousand simulated players bet repeatedly at typical
 * published odds; the law of large numbers grinds the group down.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

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

  // Scale to the highest plotted point, not the final one: in losing games the
  // band ends near zero even though it peaked far above the start.
  const yMax = Math.max(Math.max(...sim.p90, ...sim.median) * 1.1, sim.start * 1.6)
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

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function GamblingSimPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Gambling vs. investing</p>
          <h1 className={styles.h1}>Gambling Simulation</h1>
          <p className={styles.lead}>
            A thousand people walk into the same game and keep playing. Any one of them might get
            lucky, but the house keeps a cut of every bet, so as the bets pile up the group grinds
            down. This is the losing side of the same law of large numbers that later works for the
            patient investor.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <BettingStation />
      </Card>

      <p className={styles.footnote}>
        Simplified simulations for classroom discussion, not financial data or advice. Betting
        simulations assume 50/50 games at typical published odds and fees.
      </p>
    </div>
  )
}
