/*
 * Housing and mortgage parameters for 2026 — verified July 2026.
 *
 * - 30-year fixed rate: Freddie Mac Primary Mortgage Market Survey averaged
 *   6.43% the week of July 2, 2026. The tool fixes the excellent-credit rate
 *   at 6.4% and derives the other tiers from it.
 *   https://www.freddiemac.com/pmms
 * - Credit-score spreads: myFICO loan savings tables. The gap between the
 *   top tier (760+) and a mid-600s score runs about 1.1 percentage points.
 *   https://www.myfico.com/credit-education/calculators/loan-savings-calculator
 * - 15-year vs 30-year spread: Freddie Mac PMMS, historically 0.5 to 0.75
 *   points lower; fixed here at 0.6.
 * - Property tax 1.1% and insurance 0.5% of home value per year are national
 *   ballpark averages; PMI of 0.6% of the loan applies under 20% down
 *   (typical range 0.3 to 1.5%).
 * - Mortgage-interest deduction limit ($750,000 of acquisition debt, made
 *   permanent) and the SALT cap ($40,400 in 2026, phasing down to a $10,000
 *   floor above $505,000 of income): One Big Beautiful Bill Act of 2025.
 *
 * When updating for a new year: re-check the PMMS rate, the SALT cap step-up
 * (it rises 1% per year through 2029, then reverts to $10,000), and the
 * standard deduction imported from the Taxes tool's data file.
 */

export const HOUSING_YEAR = 2026

export type CreditTier = 'excellent' | 'good' | 'fair'

export const CREDIT_TIERS: { key: CreditTier; label: string; bump: number }[] = [
  { key: 'excellent', label: 'Excellent (760+)', bump: 0 },
  { key: 'good', label: 'Good (~700)', bump: 0.003 },
  { key: 'fair', label: 'Fair (~640)', bump: 0.011 },
]

export const RATES = {
  /** 30-year fixed, excellent credit. Freddie Mac PMMS, July 2026. */
  base30: 0.064,
  /** 15-year loans price about 0.6 points below 30-year loans. */
  term15Discount: 0.006,
}

export const COSTS = {
  /** Effective property tax as a share of home value, national ballpark. */
  propertyTaxRate: 0.011,
  /** Homeowners insurance as a share of home value per year. */
  insuranceRate: 0.005,
  /** Private mortgage insurance as a share of the loan per year. */
  pmiRate: 0.006,
  /** PMI applies when the down payment is below this share of the price. */
  pmiThreshold: 0.2,
}

/** Lender affordability ratios (the classic 28/36 rule). */
export const AFFORDABILITY = {
  /** Housing costs (payment + property tax + insurance) ÷ gross income. */
  housingRatio: 0.28,
  /** Housing costs plus all other debt payments ÷ gross income. */
  totalRatio: 0.36,
}

/** Interest is deductible on the first $750,000 of acquisition debt. */
export const MORTGAGE_INTEREST_CAP = 750_000

/** State and local tax (SALT) deduction cap, 2026. */
export const SALT = {
  cap: 40_400,
  /** The cap shrinks by 30¢ per dollar of income above this threshold... */
  phaseOutStart: 505_000,
  phaseOutRate: 0.3,
  /** ...but never below the old $10,000 cap. */
  floor: 10_000,
}
