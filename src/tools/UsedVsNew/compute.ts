/*
 * Used vs. New: the same car model bought new or a few years old, financed
 * at each market's average rate. Pure functions, no React.
 *
 * Fixed assumptions (stated in the UI):
 * - Depreciation: about 20% in year one, then 15% a year (Kelley Blue Book
 *   ballpark; varies by model).
 * - Average APRs from Experian, State of the Automotive Finance Market
 *   (Q4 2025): 6.37% new, 11.26% used.
 * - Nothing down, so the underwater stretch shows at its worst.
 */

export const NEW_APR = 0.0637
export const USED_APR = 0.1126

/** Value of the car at age t years (t may be fractional; year one linearized). */
export function carValue(price: number, t: number): number {
  if (t <= 0) return price
  if (t <= 1) return price * (1 - 0.2 * t)
  return price * 0.8 * 0.85 ** (t - 1)
}

export function monthlyPayment(loan: number, apr: number, months: number): number {
  if (apr === 0) return loan / months
  const i = apr / 12
  return (loan * i) / (1 - (1 + i) ** -months)
}

export interface DealPath {
  /** Sampled ages of the car (years) from purchase to loan payoff. */
  x: number[]
  value: number[]
  balance: number[]
  payment: number
  totalInterest: number
  underwaterMonths: number
  valueAtPayoff: number
  pricePaid: number
}

/**
 * Finance the car with nothing down over `months`. `startAge` is the car's
 * age at purchase (0 = new). Paths are sampled quarterly for the chart.
 * `pricePaidOverride` replaces the curve's price with a real listing; the
 * car's future value scales with it, treating the listing as the car's true
 * market value at that age.
 */
export function dealPath(
  newPrice: number,
  startAge: number,
  apr: number,
  months: number,
  pricePaidOverride?: number
): DealPath {
  const curveAtStart = carValue(newPrice, startAge)
  const pricePaid = pricePaidOverride ?? curveAtStart
  const valueAt = (age: number) => carValue(newPrice, age) * (pricePaid / curveAtStart)
  const pmt = monthlyPayment(pricePaid, apr, months)
  const i = apr / 12
  let bal = pricePaid
  let underwater = 0
  const x: number[] = [startAge]
  const value: number[] = [Math.round(pricePaid)]
  const balance: number[] = [Math.round(pricePaid)]
  for (let m = 1; m <= months; m++) {
    bal = bal * (1 + i) - pmt
    if (m === months) bal = 0
    const age = startAge + m / 12
    if (bal > valueAt(age) + 1) underwater++
    if (m % 3 === 0 || m === months) {
      x.push(age)
      value.push(Math.round(valueAt(age)))
      balance.push(Math.round(Math.max(0, bal)))
    }
  }
  return {
    x,
    value,
    balance,
    payment: pmt,
    totalInterest: pmt * months - pricePaid,
    underwaterMonths: underwater,
    valueAtPayoff: valueAt(startAge + months / 12),
    pricePaid,
  }
}

/**
 * Months to retire the used loan when paying the new car's payment instead.
 * Returns null when the payment does not clear the loan within 30 years
 * (including when it never covers the interest at all).
 */
export function fastPayoffMonths(loan: number, apr: number, bigPayment: number): number | null {
  const i = apr / 12
  let bal = loan
  let m = 0
  while (bal > 0 && m < 360) {
    bal = bal * (1 + i) - bigPayment
    m++
  }
  return bal > 0 ? null : m
}
