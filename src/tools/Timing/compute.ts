/*
 * Strategy engine for the market-timing lesson, run on real monthly
 * S&P 500 data (see spxData.ts).
 *
 * Three savers put in the same dollars every month:
 * - The monthly buyer invests immediately, every month.
 * - The bottom buyer holds cash and invests everything at the exact
 *   monthly-average bottom of every bear market (a 19%+ drawdown).
 *   This requires knowing the future; it is the impossible benchmark.
 * - The almost-perfect buyer does the same but is one month late,
 *   the most charitable version of what real dip-waiting looks like.
 *
 * Invested balances earn the index total return, computed as
 * r_t = (P_t + D_t/12) / P_{t-1} - 1. Cash earns a flat user-set rate.
 * Verified July 2026: the one-month-late buyer ends behind the monthly
 * buyer for 14 of 16 start years 1985-2015 (cash at 0%), and even the
 * perfect bottom buyer trails for most starts. Starting 1997-2001, at
 * the bubble peak, is the exception, which the page discusses honestly.
 */
import { SPX } from './spxData'

export interface Bottom {
  index: number
  y: number
  m: number
  price: number
  /** Peak-to-bottom drawdown of the monthly-average series, e.g. -0.51. */
  drawdown: number
}

/** Bear-market bottoms: local minima at least 19% below the prior peak. */
export function findBottoms(): Bottom[] {
  const bottoms: Bottom[] = []
  let peak = 0
  let ddMin = 0
  let ddIdx: number | null = null
  SPX.forEach((row, i) => {
    if (row.p > peak) {
      if (ddIdx !== null && ddMin < -0.19) {
        const b = SPX[ddIdx]!
        bottoms.push({ index: ddIdx, y: b.y, m: b.m, price: b.p, drawdown: ddMin })
      }
      peak = row.p
      ddMin = 0
      ddIdx = null
    } else {
      const dd = row.p / peak - 1
      if (dd < ddMin) {
        ddMin = dd
        ddIdx = i
      }
    }
  })
  if (ddIdx !== null && ddMin < -0.19) {
    const b = SPX[ddIdx]!
    bottoms.push({ index: ddIdx, y: b.y, m: b.m, price: b.p, drawdown: ddMin })
  }
  return bottoms
}

export const BOTTOMS = findBottoms()

export interface TimingPoint {
  /** Fractional year for the x axis, e.g. 2009.25. */
  t: number
  monthly: number
  perfect: number
  late: number
}

export interface TimingResult {
  points: TimingPoint[]
  contributed: number
  monthly: number
  perfect: number
  late: number
  /** Bottoms that fall inside the chosen window. */
  bottoms: Bottom[]
  /** Cash still waiting at the end for the perfect / late buyer. */
  perfectCashLeft: number
  /** Average index price paid per share, monthly buyer. */
  avgPriceMonthly: number
  /** Average index price paid per share on the perfect timer's deployed cash. */
  avgPricePerfect: number
}

function totalReturn(i: number): number {
  const cur = SPX[i]!
  const prev = SPX[i - 1]!
  return (cur.p + cur.d / 12) / prev.p - 1
}

export function runStrategies(
  startYear: number,
  monthlyAmount: number,
  cashRatePct: number
): TimingResult {
  const start = SPX.findIndex((r) => r.y === startYear && r.m === 1)
  const rCash = cashRatePct / 100 / 12
  const inWindow = BOTTOMS.filter((b) => b.index > start)
  const exact = new Set(inWindow.map((b) => b.index))
  const late = new Set(inWindow.map((b) => b.index + 1))

  let monthly = 0
  let pInv = 0
  let pCash = 0
  let lInv = 0
  let lCash = 0
  // Shares bought with contributions (dividends aside), to expose each
  // strategy's average purchase price.
  let mShares = 0
  let mPaid = 0
  let pShares = 0
  let pPaid = 0
  const points: TimingPoint[] = []

  for (let i = start; i < SPX.length; i++) {
    if (i > start) {
      const r = totalReturn(i)
      monthly *= 1 + r
      pInv *= 1 + r
      lInv *= 1 + r
      pCash *= 1 + rCash
      lCash *= 1 + rCash
    }
    monthly += monthlyAmount
    pCash += monthlyAmount
    lCash += monthlyAmount
    mShares += monthlyAmount / SPX[i]!.p
    mPaid += monthlyAmount
    if (exact.has(i)) {
      pShares += pCash / SPX[i]!.p
      pPaid += pCash
      pInv += pCash
      pCash = 0
    }
    if (late.has(i)) {
      lInv += lCash
      lCash = 0
    }
    const row = SPX[i]!
    points.push({
      t: row.y + (row.m - 0.5) / 12,
      monthly,
      perfect: pInv + pCash,
      late: lInv + lCash,
    })
  }

  return {
    points,
    contributed: (SPX.length - start) * monthlyAmount,
    monthly,
    perfect: pInv + pCash,
    late: lInv + lCash,
    bottoms: inWindow,
    perfectCashLeft: pCash,
    avgPriceMonthly: mPaid / mShares,
    avgPricePerfect: pShares > 0 ? pPaid / pShares : 0,
  }
}

export const FIRST_YEAR = 1985
export const LAST_LABEL = 'June 2026'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthName(m: number): string {
  return MONTHS[m - 1]!
}
