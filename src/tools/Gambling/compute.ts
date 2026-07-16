/*
 * The models behind the gambling-vs-investing lesson. All payback rates
 * are typical published figures, fixed here as vetted defaults rather
 * than exposed as controls:
 *
 * - Scratch / instant lottery: state lotteries return roughly 65 cents
 *   of each dollar of instant-ticket sales as prizes (NASPL industry
 *   totals run in the 60-70% range).
 * - Big-jackpot draw games (Powerball style): roughly 50 cents per
 *   dollar, before income tax on large prizes.
 * - Standard sports bet at -110 on both sides: stake $110 to win $100.
 *   With no forecasting skill each side wins half the time, so the
 *   expected return is 105/110 = 95.45 cents per dollar staked
 *   (a 4.5% "hold" for the book). Parlays multiply the cut; industry
 *   reports put the hold on parlays near 20% or worse.
 * - American (double-zero) roulette: house edge 5.26%, so 94.7 cents.
 * - Slot machines: casinos typically keep 5 to 12 cents per dollar
 *   played; 92 cents is a representative payback.
 * - Blackjack with sound basic strategy: about 99.5 cents; casual play
 *   gives up 1 to 2 cents more.
 *
 * The investment side is a broad stock index fund with the same
 * long-run figures used in the Diversification lesson and in Lecture
 * 11: an 8% average annual return with a 20% standard deviation.
 */

import { SPX } from '../Timing/spxData'
import { HISTORY } from './historyData'

export type GameKey = 'lottery' | 'sports' | 'slots'

export const GAMES: Record<GameKey, { label: string; payback: number; short: string }> = {
  lottery: { label: 'Lottery tickets', payback: 0.65, short: 'scratch tickets' },
  sports: { label: 'Sports bets', payback: 105 / 110, short: 'standard sports bets' },
  slots: { label: 'Slot machines', payback: 0.92, short: 'slot machines' },
}

export const INDEX_RETURN = 0.08
/** SD of yearly index returns, for the chance-of-being-ahead model. */
export const INDEX_SD_LOG = 0.18

export interface PathPoint {
  /** Calendar year, fractional (e.g. 2009.5). */
  year: number
  /** Cumulative dollars staked (or contributed). */
  staked: number
  /** The gambler's expected pocket: payback share of everything staked. */
  pocket: number
  /** The same weekly dollars in SPY, at actual historical returns. */
  invested: number
}

/** SPY, the first S&P 500 ETF, began trading in January 1993. */
export const SPY_FIRST_YEAR = 1993
export const SPY_LAST_START = 2024
export const SPY_END_LABEL = 'June 2026'

/*
 * The literal comparison: the same weekly dollars into a game vs. into
 * SPY, using the actual monthly S&P 500 total-return series (Shiller
 * data, see ../Timing/spxData.ts) rather than a modeled average. The
 * weekly habit is applied as its monthly equivalent (weekly x 52 / 12)
 * at each month's price, dividends reinvested.
 */
export function computeRealPaths(
  weekly: number,
  startYear: number,
  game: GameKey
): { points: PathPoint[]; years: number } {
  const payback = GAMES[game].payback
  const monthlyAmount = (weekly * 52) / 12
  const start = SPX.findIndex((r) => r.y === startYear && r.m === 1)
  const points: PathPoint[] = []
  let staked = 0
  let spy = 0
  for (let i = start; i < SPX.length; i++) {
    if (i > start) {
      const cur = SPX[i]!
      const prev = SPX[i - 1]!
      spy *= (cur.p + cur.d / 12) / prev.p
    }
    staked += monthlyAmount
    spy += monthlyAmount
    const row = SPX[i]!
    points.push({
      year: row.y + (row.m - 0.5) / 12,
      staked,
      pocket: payback * staked,
      invested: spy,
    })
  }
  return { points, years: Math.max(1, Math.round((SPX.length - start) / 12)) }
}

export interface AheadPoint {
  year: number
  /** P(a weekly -110 bettor with no skill is ahead after `year` years). */
  bettor: number
  /** P(a buy-and-hold index investment is above its cost after `year` years). */
  investor: number
}

/*
 * Bettor: after n weekly bets the gambler is ahead when wins * 100 >
 * losses * 110, i.e. wins > (11/21) n. Wins ~ Binomial(n, 1/2); the
 * tail is summed exactly in log space.
 */
function pBettorAhead(n: number): number {
  const kmin = Math.floor((11 * n) / 21) + 1
  if (kmin > n) return 0
  const lnHalf = Math.log(0.5)
  let lnC = 0 // ln C(n, 0)
  let p = 0
  for (let k = 0; k <= n; k++) {
    if (k >= kmin) p += Math.exp(lnC + n * lnHalf)
    if (k < n) lnC += Math.log((n - k) / (k + 1))
  }
  return Math.min(1, p)
}

/* Standard normal CDF (Abramowitz & Stegun 26.2.17). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const poly =
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const tail = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) * poly
  return z >= 0 ? 1 - tail : tail
}

/*
 * Investor: yearly log returns ~ N(m, s^2) with s = 0.18 and m chosen
 * so the arithmetic mean return is 8%. P(ahead after t years) =
 * Phi(m * sqrt(t) / s). Deliberately conservative next to the U.S.
 * historical record (positive in roughly three of every four years).
 */
export function pInvestorAhead(t: number): number {
  const s = INDEX_SD_LOG
  const m = Math.log(1 + INDEX_RETURN) - 0.5 * s * s
  return normCdf((m * Math.sqrt(t)) / s)
}

export function computeAhead(years: number): AheadPoint[] {
  const points: AheadPoint[] = []
  for (let t = 1; t <= years; t++) {
    points.push({ year: t, bettor: pBettorAhead(52 * t), investor: pInvestorAhead(t) })
  }
  return points
}

export interface OddsRow {
  label: string
  /** Expected dollars returned per $1 staked (per year, for the fund). */
  payback: number
  kind: 'gamble' | 'invest'
}

/*
 * Rolling holding-period returns, 1928-2025 (Damodaran annual data,
 * see ./historyData.ts). A "window" is every consecutive stretch of
 * `period` calendar years; its return is annualized (the geometric
 * mean), so a 20-year window's figure answers "what did each year
 * average over those 20 years."
 *
 * `startYear` clips the x-axis, not the lookback: a window is kept when
 * it ENDS in `startYear` or later. Each window still reaches back its
 * full length into the data, so a 20-year window plotted at 1983 spans
 * 1964-1983 even though the chart starts at 1983. The window can only
 * reach as far back as 1928, so end years before 1928+period-1 have no
 * window and simply don't appear.
 */

export type AssetKey = 'sp' | 'bond' | 'bill' | 'baa'

export const HISTORY_FIRST_YEAR = HISTORY[0]!.y
export const HISTORY_LAST_YEAR = HISTORY[HISTORY.length - 1]!.y

export interface RollingSeriesPoint {
  /** Calendar year the window ends in. */
  end: number
  /** Annualized return over the window. */
  v: number
}

export function rollingSeries(key: AssetKey, period: number, startYear: number): RollingSeriesPoint[] {
  const points: RollingSeriesPoint[] = []
  for (let i = period - 1; i < HISTORY.length; i++) {
    if (HISTORY[i]!.y < startYear) continue
    let growth = 1
    for (let j = i - period + 1; j <= i; j++) growth *= 1 + HISTORY[j]![key]
    points.push({ end: HISTORY[i]!.y, v: Math.pow(growth, 1 / period) - 1 })
  }
  return points
}

export interface WindowStats {
  worst: number
  worstEnd: number
  best: number
  bestEnd: number
  /** Count of windows with a negative annualized return. */
  losing: number
  n: number
}

export function seriesStats(points: RollingSeriesPoint[]): WindowStats {
  let worst = Infinity
  let best = -Infinity
  let worstEnd = 0
  let bestEnd = 0
  let losing = 0
  for (const p of points) {
    if (p.v < worst) {
      worst = p.v
      worstEnd = p.end
    }
    if (p.v > best) {
      best = p.v
      bestEnd = p.end
    }
    if (p.v < 0) losing++
  }
  return { worst, worstEnd, best, bestEnd, losing, n: points.length }
}

/**
 * Share of window end-years, common to both series, where the first
 * finished ahead. Each series keeps its own window length, so this
 * compares "the stretch ending in 1999" across the two assets.
 */
export function aheadShareOf(a: RollingSeriesPoint[], b: RollingSeriesPoint[]): number {
  const bByEnd = new Map(b.map((p) => [p.end, p.v]))
  let common = 0
  let ahead = 0
  for (const p of a) {
    const other = bByEnd.get(p.end)
    if (other === undefined) continue
    common++
    if (p.v > other) ahead++
  }
  return common === 0 ? 0 : ahead / common
}

export const ODDS: OddsRow[] = [
  { label: 'Index fund, one average year', payback: 1.08, kind: 'invest' },
  { label: 'Blackjack, sound basic strategy', payback: 0.995, kind: 'gamble' },
  { label: 'Sports bet, standard odds', payback: 105 / 110, kind: 'gamble' },
  { label: 'Roulette, double zero', payback: 1 - 2 / 38, kind: 'gamble' },
  { label: 'Slot machines', payback: 0.92, kind: 'gamble' },
  { label: 'Parlay bets', payback: 0.8, kind: 'gamble' },
  { label: 'Scratch tickets', payback: 0.65, kind: 'gamble' },
  { label: 'Jackpot draw games', payback: 0.5, kind: 'gamble' },
]
