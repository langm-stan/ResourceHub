/*
 * Chance & Ownership: the simulation engine behind the stations.
 * Sportsbook and prediction market are Monte Carlo repeated-bet sims; the
 * index fund is a deterministic fee comparison. The stock picker uses real
 * historical data (see realBoards.ts).
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
  start: number
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
export function simulateBettors({ n, bets, stake, start, winProb, winMult, feeOnWin, seed }: BettorSimParams): BettorSim {
  const rng = makeRng(seed)
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
/* Index fund: the same monthly habit at two expense ratios.           */
/* ------------------------------------------------------------------ */

export interface FeeSeries {
  /** Year indices 0..years. */
  x: number[]
  cheap: number[]
  costly: number[]
}

export const DEFAULT_RETURN_PCT = 7
export const CHEAP_FEE = 0.05

export function buildFeeSeries(
  monthly: number,
  years: number,
  feePct: number,
  returnPct: number = DEFAULT_RETURN_PCT
): FeeSeries {
  const build = (f: number) => {
    const net = (returnPct - f) / 100 / 12
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
