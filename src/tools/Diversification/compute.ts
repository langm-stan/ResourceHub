/*
 * The two models behind the diversification lesson, both taken from
 * Lecture 11 of the Econ 43 course (Lusardi):
 *
 * 1. The coin game (slides 13-16): a $1 bet split across n fair coin
 *    flips. The distribution of the net outcome is Binomial(n, 1/2)
 *    mapped onto [-$1, +$1]; extremes vanish as n grows because flips
 *    are independent.
 *
 * 2. The stock portfolio (slides 8, 10, 26-28): a typical large-cap
 *    U.S. stock has an expected return near 8% with a standard
 *    deviation near 40%; the S&P 500 as a whole has the same expected
 *    return with an SD near 20%. For an equally weighted portfolio of
 *    n such stocks with average pairwise correlation rho,
 *        var = sigma^2 * (rho + (1 - rho) / n)
 *    Calibrating the floor to the index (0.40 * sqrt(rho) = 0.20)
 *    gives rho = 0.25, in line with published estimates of average
 *    pairwise stock correlation.
 */

export const SINGLE_STOCK_SD = 0.4
export const MARKET_SD = 0.2
export const EXPECTED_RETURN = 0.08
/** Average pairwise correlation implied by the 40% -> 20% calibration. */
export const RHO = (MARKET_SD / SINGLE_STOCK_SD) ** 2

export interface CoinOutcome {
  /** Number of heads. */
  k: number
  /** Net dollars won or lost, in [-1, 1]. */
  net: number
  probability: number
}

export interface CoinGameResult {
  outcomes: CoinOutcome[]
  /** P(lose the entire dollar) = 0.5^n. */
  pLoseAll: number
  /** P(net <= -$0.50). */
  pLoseHalf: number
  /** P(|net| <= $0.10): the game ends within a dime of even. */
  pNearEven: number
}

/** Exact Binomial(n, 1/2) distribution of the coin game's net outcome. */
export function computeCoinGame(n: number): CoinGameResult {
  const outcomes: CoinOutcome[] = []
  // pmf(0) = 0.5^n, then pmf(k+1) = pmf(k) * (n - k) / (k + 1).
  let p = Math.pow(0.5, n)
  let pLoseHalf = 0
  let pNearEven = 0
  for (let k = 0; k <= n; k++) {
    const net = (2 * k - n) / n
    outcomes.push({ k, net, probability: p })
    if (net <= -0.5 + 1e-12) pLoseHalf += p
    if (Math.abs(net) <= 0.1 + 1e-12) pNearEven += p
    if (k < n) p *= (n - k) / (k + 1)
  }
  return { outcomes, pLoseAll: Math.pow(0.5, n), pLoseHalf, pNearEven }
}

export interface PortfolioPoint {
  n: number
  /** SD of an equally weighted portfolio of correlated stocks. */
  real: number
  /** SD if the same stocks moved independently. */
  independent: number
}

/** Portfolio SD for n stocks under the calibrated correlation. */
export function portfolioSd(n: number): number {
  return SINGLE_STOCK_SD * Math.sqrt(RHO + (1 - RHO) / n)
}

export function independentSd(n: number): number {
  return SINGLE_STOCK_SD / Math.sqrt(n)
}

export function computePortfolioCurve(maxN: number): PortfolioPoint[] {
  const points: PortfolioPoint[] = []
  for (let n = 1; n <= maxN; n++) {
    points.push({ n, real: portfolioSd(n), independent: independentSd(n) })
  }
  return points
}

/*
 * One stock vs. the market: lognormal growth with the arithmetic mean
 * pinned at 8%/yr for both. In log space the drift is
 *   m = ln(1.08) - sigma_log^2 / 2,
 * so the single stock (sigma_log = 0.40) has a MEDIAN growth rate of
 * about -0.3%/yr while the index (sigma_log = 0.20) grows about 5.7%/yr
 * at the median: volatility drag. The stock is modeled as the market
 * plus independent idiosyncratic noise (variance 0.40^2 - 0.20^2).
 * These model numbers line up with Bessembinder's empirical findings
 * (JFE 2018) quoted on the page.
 */
const STOCK_SIG = 0.4
const INDEX_SIG = 0.2
const STOCK_M = Math.log(1 + EXPECTED_RETURN) - (STOCK_SIG * STOCK_SIG) / 2
const INDEX_M = Math.log(1 + EXPECTED_RETURN) - (INDEX_SIG * INDEX_SIG) / 2
const IDIO_SIG = Math.sqrt(STOCK_SIG * STOCK_SIG - INDEX_SIG * INDEX_SIG)

/** Deterministic PRNG so the simulated fan is identical on every visit. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normal(rand: () => number): number {
  // Box-Muller.
  const u = Math.max(rand(), 1e-12)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface SimPath {
  /** Wealth multiple of the starting dollar, one value per year. */
  values: number[]
  final: number
}

export interface SingleStockSim {
  stocks: SimPath[]
  index: SimPath
  years: number
  /** Exact model probabilities, not simulation counts. */
  pBeatIndex: number
  pLoseMoney: number
  medianStockMultiple: number
  medianIndexMultiple: number
}

function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const poly =
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const tail = (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * poly
  return z >= 0 ? 1 - tail : tail
}

export function simulateSingleStocks(years: number, nStocks = 60): SingleStockSim {
  // Seed chosen so the shared market path lands within 1% of its true
  // 30-year median ($54.2k vs $55.2k per $10k): the drawn index line
  // should show the typical index experience, not a lucky or unlucky one.
  const rand = mulberry32(9)
  const steps = 12
  const dt = 1 / steps
  // One shared market path keeps the fan honest: stocks share the economy.
  const market: number[] = [1]
  let mw = 0
  const marketShocks: number[] = []
  for (let t = 0; t < years * steps; t++) {
    const shock = normal(rand) * INDEX_SIG * Math.sqrt(dt)
    marketShocks.push(shock)
    mw += INDEX_M * dt + shock
    if ((t + 1) % steps === 0) market.push(Math.exp(mw))
  }
  const stocks: SimPath[] = []
  for (let s = 0; s < nStocks; s++) {
    let w = 0
    const values: number[] = [1]
    for (let t = 0; t < years * steps; t++) {
      w += STOCK_M * dt + marketShocks[t]! + normal(rand) * IDIO_SIG * Math.sqrt(dt)
      if ((t + 1) % steps === 0) values.push(Math.exp(w))
    }
    stocks.push({ values, final: values[values.length - 1]! })
  }
  const T = years
  return {
    stocks,
    index: { values: market, final: market[market.length - 1]! },
    years,
    pBeatIndex: normCdf(((STOCK_M - INDEX_M) * T) / (IDIO_SIG * Math.sqrt(T))),
    pLoseMoney: normCdf((-STOCK_M * T) / (STOCK_SIG * Math.sqrt(T))),
    medianStockMultiple: Math.exp(STOCK_M * T),
    medianIndexMultiple: Math.exp(INDEX_M * T),
  }
}
