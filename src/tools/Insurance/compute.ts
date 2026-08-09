/*
 * Why Insurance Works: risk pooling in one year of a thousand households.
 * The math is deliberately the Gambling Simulation's, run in reverse: an
 * insurance premium is a negative-expected-value bet the buyer should
 * sometimes take, because the alternative is a small chance of ruin rather
 * than a small chance of a jackpot. Pure functions, no React.
 */

export interface PoolParams {
  /** Households in the pool. */
  households: number
  /** Chance each household suffers the loss this year, as a decimal. */
  lossChance: number
  /** Size of the loss when it hits. */
  lossSize: number
  /** The quoted yearly premium. */
  premium: number
  /** What each household has saved before the year starts. */
  savings: number
}

export interface PoolOutcome {
  /** Which households were hit (index-stable for the dot grid). */
  hits: boolean[]
  hitCount: number
  /** Actuarially fair premium: chance x loss. */
  fairPremium: number
  /** What the insurer charges above fair: premium - fair. */
  load: number
  /** Load as a share of the fair premium (0 when the fair premium is 0). */
  loadShare: number
  /** Average end-of-year wealth without insurance, over this draw. */
  avgUninsured: number
  /** End-of-year wealth with insurance: the same for every household. */
  endInsured: number
  /** Hit households whose savings could not absorb the loss. */
  wipedOut: number
  /** Expected number of hits: chance x households. */
  expectedHits: number
}

/**
 * Deterministic PRNG (mulberry32) so a classroom result changes only when
 * the visitor asks for another year, never on a re-render.
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

export function simulatePool(p: PoolParams, seed: number): PoolOutcome {
  const rand = mulberry32(seed)
  const hits: boolean[] = []
  let hitCount = 0
  for (let i = 0; i < p.households; i++) {
    const hit = rand() < p.lossChance
    hits.push(hit)
    if (hit) hitCount++
  }
  const fairPremium = p.lossChance * p.lossSize
  const load = p.premium - fairPremium
  return {
    hits,
    hitCount,
    fairPremium,
    load,
    loadShare: fairPremium > 0 ? load / fairPremium : 0,
    avgUninsured: p.savings - (hitCount * p.lossSize) / p.households,
    endInsured: p.savings - p.premium,
    wipedOut: p.lossSize > p.savings ? hitCount : 0,
    expectedHits: p.lossChance * p.households,
  }
}

/* ---------------- the "should you insure it?" scenarios ---------------- */

export interface Scenario {
  key: string
  label: string
  /** Chance of the loss over the period the premium covers, as a decimal. */
  lossChance: number
  lossSize: number
  /** The quoted premium for that same period. */
  premium: number
  /** How the premium is usually quoted, e.g. "$12/mo". */
  quotedAs: string
  /** The stated classroom assumption behind the numbers. */
  note: string
}

/*
 * Round classroom numbers, stated as assumptions rather than market quotes;
 * the point is the structure of each decision, not a price survey. The
 * verdict is computed, not stored: a loss above the visitor's own cushion is
 * worth insuring even at a load, and a loss below it is cheaper to absorb.
 */
export const SCENARIOS: Scenario[] = [
  {
    key: 'phone',
    label: 'Phone protection plan',
    lossChance: 0.15,
    lossSize: 400,
    premium: 144,
    quotedAs: '$12/mo',
    note: 'Assume a 15% chance each year of a $400 repair or replacement.',
  },
  {
    key: 'tv',
    label: 'TV extended warranty',
    lossChance: 0.03,
    lossSize: 600,
    premium: 90,
    quotedAs: '$90/yr',
    note: 'Assume a 3% chance each year the set fails after the maker’s warranty.',
  },
  {
    key: 'rental',
    label: 'Rental car damage waiver',
    lossChance: 0.02,
    lossSize: 2_500,
    premium: 175,
    quotedAs: '$25/day for a week',
    note: 'Assume a 2% chance of damage on a one-week rental, with $2,500 of exposure your own policy or card does not already cover.',
  },
  {
    key: 'renters',
    label: 'Renters insurance',
    lossChance: 0.01,
    lossSize: 20_000,
    premium: 240,
    quotedAs: '$20/mo',
    note: 'Assume a 1% chance each year of losing $20,000 of belongings to fire or theft, plus the liability cover that rides along.',
  },
  {
    key: 'term-life',
    label: 'Term life for a breadwinner',
    lossChance: 0.0006,
    lossSize: 500_000,
    premium: 400,
    quotedAs: '$33/mo',
    note: 'Assume a 6-in-10,000 chance this year for a healthy, screened 35-year-old, and $500,000 of income the family would lose.',
  },
  {
    key: 'flood',
    label: 'Flood insurance, high-risk zone',
    lossChance: 0.01,
    lossSize: 150_000,
    premium: 2_000,
    quotedAs: '$2,000/yr',
    note: 'Assume the mapped 1%-a-year flood zone and $150,000 of damage to the house.',
  },
]

export interface ScenarioVerdict {
  fairPremium: number
  load: number
  loadShare: number
  /** True when the loss is bigger than the visitor's stated cushion. */
  ruinous: boolean
}

export function judgeScenario(s: Scenario, cushion: number): ScenarioVerdict {
  const fairPremium = s.lossChance * s.lossSize
  const load = s.premium - fairPremium
  return {
    fairPremium,
    load,
    loadShare: fairPremium > 0 ? load / fairPremium : 0,
    ruinous: s.lossSize > cushion,
  }
}
