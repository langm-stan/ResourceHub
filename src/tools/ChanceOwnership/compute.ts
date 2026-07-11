/*
 * Chance & Ownership: the simulation engine behind the four stations.
 * Sportsbook and prediction market are Monte Carlo repeated-bet sims; the
 * stock picker draws 100 tickets from the real statistical shape of
 * single-stock outcomes; the index fund is a deterministic fee comparison.
 */

/** Seeded LCG so runs are repeatable within a draw but re-runnable on demand. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export interface BettorSimParams {
  n: number
  bets: number
  stake: number
  winProb: number
  winMult: number
  feeOnWin: number
  seed: number
}

export interface BettorSim {
  /** Bet counts at which the population was sampled. */
  x: number[]
  median: number[]
  p10: number[]
  p90: number[]
  /** Share of players above their starting bankroll at the end. */
  ahead: number
  /** Share of players who lost everything. */
  busted: number
  medFinal: number
  start: number
}

/** Monte Carlo: n players betting repeatedly. Returns sampled series. */
export function simulateBettors({ n, bets, stake, winProb, winMult, feeOnWin, seed }: BettorSimParams): BettorSim {
  const rng = makeRng(seed)
  const start = 1000
  const step = Math.max(1, Math.floor(bets / 60))
  const samplesX: number[] = []
  for (let b = 0; b <= bets; b += step) samplesX.push(b)
  if (samplesX[samplesX.length - 1] !== bets) samplesX.push(bets)

  const banks = new Float64Array(n).fill(start)
  const alive = new Uint8Array(n).fill(1)
  const snapshots: number[][] = [Array.from(banks)]
  let si = 1

  for (let b = 1; b <= bets; b++) {
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue
      const s = Math.min(stake, banks[i]!)
      if (s <= 0) {
        alive[i] = 0
        continue
      }
      if (rng() < winProb) banks[i]! += s * winMult * (1 - feeOnWin)
      else banks[i]! -= s
      if (banks[i]! < 1) {
        banks[i] = 0
        alive[i] = 0
      }
    }
    if (b === samplesX[si]) {
      snapshots.push(Array.from(banks))
      si++
    }
  }

  const pct = (arr: number[], p: number) => {
    const a = [...arr].sort((x, y) => x - y)
    return a[Math.min(a.length - 1, Math.floor(p * a.length))]!
  }

  const median = snapshots.map((s) => pct(s, 0.5))
  const p10 = snapshots.map((s) => pct(s, 0.1))
  const p90 = snapshots.map((s) => pct(s, 0.9))
  const final = snapshots[snapshots.length - 1]!
  const ahead = final.filter((v) => v > start).length / n
  const busted = final.filter((v) => v <= 0).length / n
  const medFinal = pct(final, 0.5)

  return { x: samplesX, median, p10, p90, ahead, busted, medFinal, start }
}

/* ------------------------------------------------------------------ */
/* Stock picker data. Index returns are actual approximate S&P 500     */
/* price returns from January of each year. Individual tickets are     */
/* generated from the real statistical shape of single-stock outcomes: */
/* lognormal spread, negative median alpha, a fat tail of collapses    */
/* and superstars (cf. Bessembinder: a small minority of stocks create */
/* nearly all excess wealth; most underperform the index).             */
/* ------------------------------------------------------------------ */

export interface PickYear {
  sp: { r1: number; r5: number; r10: number }
  topCap: number
  note: string
}

export const PICK_YEARS: Record<number, PickYear> = {
  1995: { sp: { r1: 34, r5: 210, r10: 160 }, topCap: 87, note: "America's blue chips, with the mid-90s boom ahead." },
  2000: { sp: { r1: -6, r5: -17, r10: -22 }, topCap: 560, note: 'The dot-com peak. Everything looked unstoppable.' },
  2010: { sp: { r1: 13, r5: 85, r10: 190 }, topCap: 320, note: 'Just after the financial crisis.' },
  2015: { sp: { r1: -6, r5: 57, r10: 185 }, topCap: 650, note: 'Tech giants rising, oil giants fading.' },
}

function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface Ticket {
  cap: string
  r1: number
  r5: number
  r10: number
}

export function generateTickets(year: number, draw: number): Ticket[] {
  const { sp, topCap } = PICK_YEARS[year]!
  const rng = makeRng(year * 7919 + draw * 104729 + 17)
  const spF = [1 + sp.r1 / 100, 1 + sp.r5 / 100, 1 + sp.r10 / 100] as const
  const sigma = 0.3 // idiosyncratic annual vol
  const tickets: Ticket[] = []
  for (let i = 0; i < 100; i++) {
    // Market cap: a rough power law down the rank list.
    const cap = topCap * Math.pow(i + 1, -0.85) * (0.9 + 0.2 * rng())
    // Per-stock annual log-alpha: a mixture of decliners, superstars, and the pack.
    const u = rng()
    const alpha =
      u < 0.08 ? -0.25 + 0.1 * normal(rng) : u > 0.95 ? 0.18 + 0.08 * normal(rng) : -0.02 + 0.07 * normal(rng)
    // Brownian idiosyncratic path sampled at years 1, 5, 10.
    const w1 = Math.sqrt(1) * normal(rng)
    const w5 = w1 + Math.sqrt(4) * normal(rng)
    const w10 = w5 + Math.sqrt(5) * normal(rng)
    const F = (t: number, w: number, spf: number) => Math.max(0.01, spf * Math.exp(alpha * t + sigma * w))
    tickets.push({
      cap: cap >= 100 ? `$${Math.round(cap)}B` : `$${cap.toFixed(0)}B`,
      r1: Math.round((F(1, w1, spF[0]) - 1) * 100),
      r5: Math.round((F(5, w5, spF[1]) - 1) * 100),
      r10: Math.round((F(10, w10, spF[2]) - 1) * 100),
    })
  }
  return tickets
}

/* ------------------------------------------------------------------ */
/* Index fund: the same monthly habit at two expense ratios.           */
/* ------------------------------------------------------------------ */

export interface FeeSeries {
  /** Year indices 0..years. */
  x: number[]
  cheap: number[]
  costly: number[]
}

const ANNUAL_RETURN = 0.07
export const CHEAP_FEE = 0.05

export function buildFeeSeries(monthly: number, years: number, feePct: number): FeeSeries {
  const build = (f: number) => {
    const net = (ANNUAL_RETURN - f / 100) / 12
    const ys = [0]
    let v = 0
    for (let m = 1; m <= years * 12; m++) {
      v = v * (1 + net) + monthly
      if (m % 12 === 0) ys.push(v)
    }
    return ys
  }
  return {
    cheap: build(CHEAP_FEE),
    costly: build(feePct),
    x: Array.from({ length: years + 1 }, (_, i) => i),
  }
}
