/**
 * Financial-freedom math: how long until investment income covers spending,
 * so work becomes optional. Pure functions, no React.
 *
 * Fixed planning assumptions (vetted defaults, stated in the UI):
 * - 7% real return while saving (the course's long-horizon planning rate).
 * - Freedom pile = 25x annual spending, the standard 4% withdrawal guideline.
 * - The optional employer match adds 3% of income to saving, a typical
 *   50-cents-per-dollar match on the first 6% of pay.
 */

export const RETURN_RATE = 0.07
export const WITHDRAW_RATE = 0.04
export const SPEND_MULTIPLE = 1 / WITHDRAW_RATE
export const MATCH_BOOST = 0.03

export interface FreedomResult {
  income: number
  spendYr: number
  /** Dollars saved per year, including any match. */
  savingYr: number
  /** Saving as a share of income (with the match counted). */
  savingsRate: number
  /** The pile at which 4% withdrawals cover spending. */
  pile: number
  /** Years until the pile is reached (Infinity when nothing is saved). */
  years: number
  /** Age when work becomes optional (null when never). */
  freedomAge: number | null
}

/** Years to reach `multiple x spending` saving a share s of income at rate r. */
export function yearsToFreedom(savingsRate: number, r = RETURN_RATE): number {
  const s = savingsRate
  if (s >= 1) return 0
  if (s <= 0) return Number.POSITIVE_INFINITY
  // Solve s * ((1+r)^T - 1)/r = M * (1 - s) for T.
  const target = (SPEND_MULTIPLE * (1 - s) * r) / s + 1
  return Math.log(target) / Math.log(1 + r)
}

export function computeFreedom(
  age: number,
  income: number,
  spendMo: number,
  withMatch: boolean
): FreedomResult {
  const spendYr = spendMo * 12
  const savingYr = Math.max(0, income - spendYr) + (withMatch ? MATCH_BOOST * income : 0)
  const savingsRate = income > 0 ? savingYr / income : 0
  const pile = SPEND_MULTIPLE * spendYr
  // Freedom depends on the ratio of saving to spending, expressed as a rate
  // on the combined flow so the closed form above applies.
  const s = savingYr + spendYr > 0 ? savingYr / (savingYr + spendYr) : 0
  const years = yearsToFreedom(s)
  return {
    income,
    spendYr,
    savingYr,
    savingsRate,
    pile,
    years,
    freedomAge: Number.isFinite(years) ? age + years : null,
  }
}

export interface WealthPoint {
  year: number
  age: number
  wealth: number
  /** What 4% of the wealth pays per year, the "investment paycheck". */
  investmentIncome: number
}

/** The wealth path until (a few years past) the crossover, capped at 60 years. */
export function wealthPath(age: number, savingYr: number, years: number): WealthPoint[] {
  const horizon = Math.min(60, Number.isFinite(years) ? Math.ceil(years) + 6 : 60)
  const pts: WealthPoint[] = []
  let w = 0
  for (let t = 0; t <= horizon; t++) {
    pts.push({ year: t, age: age + t, wealth: w, investmentIncome: w * WITHDRAW_RATE })
    w = w * (1 + RETURN_RATE) + savingYr
  }
  return pts
}

export interface Scenario {
  key: string
  label: string
  /** Short description shown under the chip row when active. */
  blurb: string
  income: number
  spendMo: number
  startAge: number
}

/**
 * The point of the chips: freedom follows the GAP between income and
 * spending, not the income. The rookie out-earns everyone and finishes last.
 */
export const SCENARIOS: Scenario[] = [
  {
    key: 'rookie',
    label: 'NBA rookie',
    blurb: 'A $600,000 take-home with a $550,000 lifestyle. The league’s average career is over before the plan starts working.',
    income: 600_000,
    spendMo: 45_833,
    startAge: 20,
  },
  {
    key: 'teacher',
    label: 'Teacher',
    blurb: 'A $60,000 take-home, spending $4,250 a month.',
    income: 60_000,
    spendMo: 4_250,
    startAge: 24,
  },
  {
    key: 'engineer',
    label: 'Engineer',
    blurb: 'A $120,000 take-home, spending $8,000 a month.',
    income: 120_000,
    spendMo: 8_000,
    startAge: 23,
  },
  {
    key: 'barista',
    label: 'Barista',
    blurb: 'A $32,000 take-home, spending $2,000 a month and keeping a quarter of every check.',
    income: 32_000,
    spendMo: 2_000,
    startAge: 20,
  },
]
