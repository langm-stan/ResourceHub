/*
 * Why Insurance Works: a thousand households, twenty years, one draw read
 * two ways (everybody buys, nobody buys). The visitor states a risk, the
 * insurer prices it, and the simulation shows what each choice costs.
 * Pure functions, no React.
 */

export const HOUSEHOLDS = 1_000

/** How long the simulation runs: enough years for the odds to find people. */
export const SIM_YEARS = 20

/**
 * Deterministic PRNG (mulberry32) so a classroom result changes only when
 * the visitor asks for another run, never on a re-render.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Premium dollars charged per expected dollar paid out. U.S. insurers return
 * roughly 65 to 75 cents of each premium dollar as claims; the rest runs the
 * company. The visitor never sets the price: the insurer does.
 */
export const LOAD = 1.4

export interface Quote {
  /** Actuarially fair premium: chance × loss, the pool's claims per household. */
  fairPremium: number
  /** What the insurer actually charges: the fair premium marked up by the load. */
  premium: number
  /** The markup in dollars: premium − fair. */
  load: number
}

/** The price the insurer imposes for this risk, rounded to whole dollars. */
export function quoteFor(lossChance: number, lossSize: number): Quote {
  const fairPremium = Math.round(lossChance * lossSize)
  const premium = Math.round(lossChance * lossSize * LOAD)
  return { fairPremium, premium, load: premium - fairPremium }
}

/* What happens to the uninsured household the loss finds: few households can
 * pay a large bill in cash, so it becomes a loan. Typical personal-loan
 * terms, matching the Paying off Debt lesson's installment math. */
export const FINANCE_APR = 0.12
export const FINANCE_YEARS = 5

export interface FinancedBill {
  monthly: number
  totalInterest: number
  /** Everything repaid over the life of the loan: the bill plus its interest. */
  total: number
}

/** The loss as most households actually pay it: financed month by month. */
export function financedBill(lossSize: number): FinancedBill {
  const r = FINANCE_APR / 12
  const n = FINANCE_YEARS * 12
  const monthly = (lossSize * r) / (1 - (1 + r) ** -n)
  const total = monthly * n
  return {
    monthly: Math.round(monthly),
    totalInterest: Math.round(total - lossSize),
    total: Math.round(total),
  }
}

export interface SimRun {
  /** hitsByYear[y][i]: whether the loss found household i in year y+1. */
  hitsByYear: boolean[][]
  /** Total hits per household over all SIM_YEARS years. */
  totalHits: number[]
  /**
   * Average cumulative uninsured cost per household at the end of each year,
   * index 0 (before year one, always 0) through SIM_YEARS.
   */
  avgBare: number[]
  /**
   * Share of non-buyers whose losses so far exceed what a buyer has paid so
   * far, per year 0..SIM_YEARS. Ratchets up: nobody un-draws a loss.
   */
  worseShare: number[]
  /** Households the loss found at least once. */
  hitAtLeastOnce: number
  /** The unluckiest household's hit count. */
  maxHits: number
}

/**
 * The same SIM_YEARS years of shocks for HOUSEHOLDS households. Both worlds
 * in the lesson (nobody insured, everybody insured) read from this one draw,
 * so the comparison is never about different luck.
 */
export function simulateYears(lossChance: number, lossSize: number, seed: number): SimRun {
  const rand = mulberry32(seed)
  const premium = quoteFor(lossChance, lossSize).premium
  const hitsByYear: boolean[][] = []
  const totalHits = new Array<number>(HOUSEHOLDS).fill(0)
  const avgBare: number[] = [0]
  const worseShare: number[] = [0]
  let cumulativeHits = 0
  for (let y = 0; y < SIM_YEARS; y++) {
    const row: boolean[] = []
    for (let i = 0; i < HOUSEHOLDS; i++) {
      const hit = rand() < lossChance
      row.push(hit)
      if (hit) {
        totalHits[i]!++
        cumulativeHits++
      }
    }
    hitsByYear.push(row)
    avgBare.push((cumulativeHits * lossSize) / HOUSEHOLDS)
    const paidByBuyers = (y + 1) * premium
    let worse = 0
    for (let i = 0; i < HOUSEHOLDS; i++) {
      if (totalHits[i]! * lossSize > paidByBuyers) worse++
    }
    worseShare.push(worse / HOUSEHOLDS)
  }
  return {
    hitsByYear,
    totalHits,
    avgBare,
    worseShare,
    hitAtLeastOnce: totalHits.filter((h) => h > 0).length,
    maxHits: Math.max(...totalHits),
  }
}
