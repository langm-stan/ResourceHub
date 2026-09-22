import { BTC, SPX } from './marketData'

/*
 * What bitcoin's price history says about holding it.
 *
 * Everything here is computed from the committed FRED series rather than
 * typed in, so a refresh of the data moves every number on the page.
 *
 * Bitcoin trades every day and the S&P does not, so the two are never
 * compared observation for observation. Each is measured on its own trading
 * calendar and annualised by its own count: 365 days a year for bitcoin, 252
 * for the S&P. Comparing them any other way would make bitcoin look calmer
 * than it is, by counting its weekends as days when nothing happened.
 */

const DAY_MS = 86_400_000

function addDays(iso: string, days: number): Date {
  return new Date(Date.parse(iso) + days * DAY_MS)
}

export interface Point {
  /** Days since the series start. */
  t: number
  date: Date
  price: number
}

/** Bitcoin: one close per calendar day. */
export const btcSeries: Point[] = BTC.close.map((price, i) => ({
  t: i,
  date: addDays(BTC.start, i),
  price,
}))

/** The S&P: one close per trading day, carrying its own offsets. */
export const spxSeries: Point[] = SPX.offset.map((t, i) => ({
  t,
  date: addDays(SPX.start, t),
  price: SPX.close[i]!,
}))

function dailyReturns(series: Point[]): number[] {
  const out: number[] = []
  for (let i = 1; i < series.length; i++) out.push(series[i]!.price / series[i - 1]!.price - 1)
  return out
}

/** Population standard deviation, annualised by the series' own day count. */
function annualisedVol(returns: number[], daysPerYear: number): number {
  const n = returns.length
  if (n === 0) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / n
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  return Math.sqrt(variance) * Math.sqrt(daysPerYear)
}

const shareBeyond = (returns: number[], threshold: number) =>
  returns.filter((r) => Math.abs(r) > threshold).length / returns.length

export interface Drawdown {
  /** Negative, e.g. -0.84 for a fall of 84%. */
  depth: number
  peakDate: Date
  troughDate: Date
  /** The day the price first regained the old peak, or null if it has not. */
  recoveredDate: Date | null
  /** Days from the peak to that recovery, or null. */
  recoveryDays: number | null
}

/*
 * Every fall from an all-time high to the low before the next one, deepest
 * first. Recovery is measured from the peak rather than the trough, because
 * the wait a holder actually serves starts the day they bought at the top.
 */
export function drawdowns(series: Point[]): Drawdown[] {
  const out: Drawdown[] = []
  let peak = series[0]!.price
  let peakIndex = 0
  let current: { depth: number; peakIndex: number; troughIndex: number } | null = null

  for (let i = 1; i < series.length; i++) {
    const { price } = series[i]!
    if (price > peak) {
      if (current) out.push(finish(current))
      current = null
      peak = price
      peakIndex = i
      continue
    }
    const depth = price / peak - 1
    if (!current || depth < current.depth) current = { depth, peakIndex, troughIndex: i }
  }
  if (current) out.push(finish(current))

  function finish(d: { depth: number; peakIndex: number; troughIndex: number }): Drawdown {
    const peakPrice = series[d.peakIndex]!.price
    let recovered: Point | null = null
    for (let i = d.troughIndex + 1; i < series.length; i++) {
      if (series[i]!.price >= peakPrice) {
        recovered = series[i]!
        break
      }
    }
    return {
      depth: d.depth,
      peakDate: series[d.peakIndex]!.date,
      troughDate: series[d.troughIndex]!.date,
      recoveredDate: recovered?.date ?? null,
      recoveryDays: recovered ? recovered.t - series[d.peakIndex]!.t : null,
    }
  }

  return out.sort((a, b) => a.depth - b.depth)
}

/** How far below the prior all-time high the price sat on each day. */
export function underwaterPath(series: Point[]): { t: number; date: Date; depth: number }[] {
  let peak = 0
  return series.map((p) => {
    peak = Math.max(peak, p.price)
    return { t: p.t, date: p.date, depth: p.price / peak - 1 }
  })
}

/** Best and worst return over any window of the given length, in days. */
function extremesOver(series: Point[], days: number) {
  let best = { ret: -Infinity, from: series[0]!, to: series[0]! }
  let worst = { ret: Infinity, from: series[0]!, to: series[0]! }
  for (let i = 0; i + days < series.length; i++) {
    const from = series[i]!
    const to = series[i + days]!
    const ret = to.price / from.price - 1
    if (ret > best.ret) best = { ret, from, to }
    if (ret < worst.ret) worst = { ret, from, to }
  }
  return { best, worst }
}

export function bitcoinRisk() {
  // Like for like: both series measured from the day the later one begins.
  const from = Math.max(btcSeries[0]!.date.getTime(), spxSeries[0]!.date.getTime())
  const btcWindow = btcSeries.filter((p) => p.date.getTime() >= from)
  const spxWindow = spxSeries.filter((p) => p.date.getTime() >= from)
  const btcReturns = dailyReturns(btcWindow)
  const spxReturns = dailyReturns(spxWindow)

  const btcVol = annualisedVol(btcReturns, 365)
  const spxVol = annualisedVol(spxReturns, 252)

  return {
    windowStart: new Date(from),
    windowEnd: btcSeries[btcSeries.length - 1]!.date,
    btcVol,
    spxVol,
    volRatio: spxVol > 0 ? btcVol / spxVol : 0,
    bigDays: [0.05, 0.1].map((threshold) => ({
      threshold,
      btc: shareBeyond(btcReturns, threshold),
      spx: shareBeyond(spxReturns, threshold),
    })),
    worstDrawdowns: drawdowns(btcSeries).slice(0, 3),
    year: extremesOver(btcSeries, 365),
    first: btcSeries[0]!,
    last: btcSeries[btcSeries.length - 1]!,
  }
}
