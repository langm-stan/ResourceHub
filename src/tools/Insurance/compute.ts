/*
 * Why Insurance Works. The lesson runs on one fixed scenario, lived three
 * ways: the player's own fifteen years (decided one year at a time), the
 * mirror household that makes the opposite choice against the same dice,
 * and a thousand parallel lives replaying the player's choices against
 * fresh dice. An insurance premium is a negative-expected-value bet the
 * buyer should sometimes take; the counterfactuals are what make that
 * visible. Pure functions, no React.
 */

/*
 * Fixed teaching scenario. The loss is larger than the early-game buffer on
 * purpose, so ruin is genuinely possible: at these numbers, never insuring
 * ends in ruin in roughly one game in five while still finishing ahead of
 * always insuring slightly more often than not (verified by simulation).
 */
export const SOLO = {
  startSavings: 15_000,
  /** What the household puts away each year before any loss or premium. */
  yearlySaving: 5_000,
  lossChance: 0.1,
  lossSize: 25_000,
  premium: 3_000,
  years: 15,
} as const

/** Fair premium (chance x loss) and the load above it. */
export const SOLO_FAIR = SOLO.lossChance * SOLO.lossSize
export const SOLO_LOAD = SOLO.premium - SOLO_FAIR

/** Insuring every year is deterministic: savings accumulate net of premiums. */
export const ALWAYS_FINAL = SOLO.startSavings + SOLO.years * (SOLO.yearlySaving - SOLO.premium)

/**
 * Deterministic PRNG (mulberry32) so a game's dice change only when a new
 * game begins, never on a re-render.
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
 * The game's dice, all rolled when the game begins: whether year k brings
 * the loss does not depend on whether anyone insured. That is what makes
 * every comparison in the tool an honest same-years comparison.
 */
export function drawHits(seed: number, years: number, chance: number): boolean[] {
  const rand = mulberry32(seed)
  return Array.from({ length: years }, () => rand() < chance)
}

/** One year: add the saving, then pay the premium or eat the loss. */
export function applyYear(balance: number, insured: boolean, hit: boolean): number {
  const afterSaving = balance + SOLO.yearlySaving
  return insured ? afterSaving - SOLO.premium : afterSaving - (hit ? SOLO.lossSize : 0)
}

/**
 * The balance path a choice sequence walks over given dice. The path stops
 * after a balance goes below zero: a wiped-out household plays no more years.
 */
export function choicesPath(hits: boolean[], choices: boolean[]): number[] {
  const path: number[] = [SOLO.startSavings]
  for (let i = 0; i < choices.length; i++) {
    const prev = path[path.length - 1]!
    if (prev < 0) break
    path.push(applyYear(prev, choices[i]!, hits[i]!))
  }
  return path
}

export interface ManyRuns {
  /** One entry per parallel life, in run order. */
  outcomes: ('ruined' | 'ahead' | 'notAhead')[]
  ruined: number
  ahead: number
  medianFinal: number
}

/**
 * A thousand parallel lives replaying the player's choices against fresh
 * dice. A partial game (the player was wiped out early) is extended by
 * repeating the final choice. Outcomes compare each life's final balance
 * with the certain always-insured path: ruined, ahead of it, or not.
 */
export function runStrategyMany(choices: boolean[], runs: number, seedBase: number): ManyRuns {
  const padded = [...choices]
  while (padded.length < SOLO.years) padded.push(padded[padded.length - 1] ?? true)

  const outcomes: ManyRuns['outcomes'] = []
  const finals: number[] = []
  let ruined = 0
  let ahead = 0
  for (let r = 0; r < runs; r++) {
    const hits = drawHits(seedBase + r * 104_729 + 17, SOLO.years, SOLO.lossChance)
    const path = choicesPath(hits, padded)
    const final = path[path.length - 1]!
    finals.push(final)
    if (final < 0) {
      outcomes.push('ruined')
      ruined++
    } else if (final > ALWAYS_FINAL) {
      outcomes.push('ahead')
      ahead++
    } else {
      outcomes.push('notAhead')
    }
  }
  finals.sort((a, b) => a - b)
  const mid = Math.floor(runs / 2)
  const medianFinal = runs % 2 === 1 ? finals[mid]! : (finals[mid - 1]! + finals[mid]!) / 2
  return { outcomes, ruined, ahead, medianFinal }
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
