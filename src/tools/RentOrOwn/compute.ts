/*
 * Rent or Own: the year-one cost test and the longer wealth race between an
 * owner and a renter of the same home. Mortgage and cost parameters come
 * from the Housing tool's vetted data (one place for annual updates).
 *
 * Fixed planning assumptions (stated in the UI):
 * - 30-year fixed at the Housing tool's excellent-credit rate (6.4%, 2026).
 * - Property tax 1.1% and insurance 0.5% of home value per year; upkeep at
 *   the 1%-of-value rule of thumb.
 * - PMI matches the Housing tool: 0.6% of the loan per year when the down
 *   payment is under 20%, charged on the original loan.
 * - The alternative return on money not tied up in the house is 7%, the
 *   course's long-horizon planning rate.
 * - Rents grow 3% per year; buyer pays 3% closing costs going in; seller
 *   pays 6% of the sale price coming out.
 */
import { COSTS, RATES } from '../Housing/data2026'

export const APR = RATES.base30
export const PROPERTY_TAX = COSTS.propertyTaxRate
export const INSURANCE = COSTS.insuranceRate
export const PMI_RATE = COSTS.pmiRate
export const PMI_THRESHOLD = COSTS.pmiThreshold
export const UPKEEP = 0.01
export const ALT_RETURN = 0.07
export const RENT_GROWTH = 0.03
export const BUY_CLOSING = 0.03
export const SELL_COSTS = 0.06
export const HORIZON = 30

export type Growth = 'flat' | 'typical' | 'hot'
export const GROWTH_RATES: Record<Growth, number> = { flat: 0, typical: 0.03, hot: 0.05 }

export function monthlyPayment(loan: number, apr = APR, months = 360): number {
  const i = apr / 12
  return (loan * i) / (1 - (1 + i) ** -months)
}

export interface YearRow {
  year: number
  /** Owner's sellable wealth: home value less balance and selling costs. */
  owner: number
  /** Renter's wealth: the invested down payment, closing costs, and monthly differences. */
  renter: number
}

export interface RaceResult {
  rows: YearRow[]
  /** First year (1-based) the owner's wealth passes the renter's; null if never within the horizon. */
  breakEvenYear: number | null
  ownerMonthlyYear1: number
  pAndI: number
  /** Net year-one cost of owning per month: pure costs + forgone return on cash in, less principal. */
  netOwnCostYear1: number
  /** The pieces of the year-one net cost, per month. */
  interestMoYear1: number
  escrowUpkeepMoYear1: number
  /** What the down payment would have earned at the planning return. */
  forgoneReturnMo: number
  /** Monthly mortgage insurance; zero at 20% down or more. */
  pmiMo: number
  /** Principal paid: spending that becomes equity rather than cost. */
  principalMoYear1: number
}

/**
 * Both households live in the same house. The owner puts down `downShare`
 * plus closing costs and pays PITI + upkeep; the renter pays rent, invests
 * the same up-front cash, and each month whoever pays less invests the
 * difference. Wealth is compared if the owner sold in year t.
 */
export function wealthRace(
  price: number,
  rent0: number,
  downShare: number,
  growth: Growth,
  apr = APR
): RaceResult {
  const g = GROWTH_RATES[growth]
  const down = price * downShare
  const closing = price * BUY_CLOSING
  const loan = price - down
  const pAndI = monthlyPayment(loan, apr)
  // Same rule as the Housing tool: PMI on the original loan below 20% down.
  const pmiMo = loan > 0 && downShare < PMI_THRESHOLD ? (loan * PMI_RATE) / 12 : 0
  const iMo = apr / 12
  const rMo = ALT_RETURN / 12

  let balance = loan
  let renterFund = down + closing // the cash the buyer handed over on day one
  let ownerFund = 0 // owner's investable savings in months where owning is cheaper
  const rows: YearRow[] = []

  let interestY1 = 0
  let principalY1 = 0

  for (let year = 1; year <= HORIZON; year++) {
    const value = price * (1 + g) ** (year - 1)
    const rent = rent0 * (1 + RENT_GROWTH) ** (year - 1)
    const ownCostMo = pAndI + pmiMo + (value * (PROPERTY_TAX + INSURANCE + UPKEEP)) / 12
    for (let m = 0; m < 12; m++) {
      const interest = balance * iMo
      const principal = pAndI - interest
      balance -= principal
      if (year === 1) {
        interestY1 += interest
        principalY1 += principal
      }
      const diff = ownCostMo - rent
      renterFund *= 1 + rMo
      ownerFund *= 1 + rMo
      if (diff > 0) renterFund += diff
      else ownerFund += -diff
    }
    const endValue = price * (1 + g) ** year
    rows.push({
      year,
      owner: Math.round(endValue * (1 - SELL_COSTS) - balance + ownerFund),
      renter: Math.round(renterFund),
    })
  }

  const breakEvenYear = rows.find((r) => r.owner >= r.renter)?.year ?? null
  const value1 = price
  const pureCostY1 =
    interestY1 + pmiMo * 12 + value1 * (PROPERTY_TAX + INSURANCE + UPKEEP)
  // Matches the lecture's year-one test: down-payment opportunity cost only;
  // closing costs stay in the wealth race, where they belong.
  const netOwnCostYear1 = (pureCostY1 + down * ALT_RETURN - principalY1) / 12

  return {
    rows,
    breakEvenYear,
    ownerMonthlyYear1: pAndI + pmiMo + (value1 * (PROPERTY_TAX + INSURANCE + UPKEEP)) / 12,
    pAndI,
    netOwnCostYear1,
    interestMoYear1: interestY1 / 12,
    escrowUpkeepMoYear1: (value1 * (PROPERTY_TAX + INSURANCE + UPKEEP)) / 12,
    forgoneReturnMo: (down * ALT_RETURN) / 12,
    pmiMo,
    principalMoYear1: principalY1 / 12,
  }
}
