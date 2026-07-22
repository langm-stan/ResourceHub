/*
 * Bond pricing for the Investing in Financial Markets unit: the price of a
 * bond is the present value of its remaining cash flows at the market rate.
 * Coupon bonds discount per payment period; a zero-coupon bill discounts its
 * single payment with annual compounding, matching the lecture's T-bill
 * example ($985.33 for $1,000 in six months at 3%).
 */

export interface BondQuote {
  price: number
  /** One coupon payment; 0 for a zero-coupon bill. */
  pmt: number
  /** Number of coupon payments; 0 for a zero-coupon bill. */
  n: number
  /** The discount rate per payment period. */
  perPeriodRate: number
  zero: boolean
}

export function priceBond(
  face: number,
  couponPct: number,
  perYear: number,
  years: number,
  marketPct: number,
): BondQuote {
  const r = marketPct / 100
  if (couponPct === 0) {
    return { price: face / Math.pow(1 + r, years), pmt: 0, n: 0, perPeriodRate: r, zero: true }
  }
  const i = r / perYear
  const n = Math.max(1, Math.round(years * perYear))
  const pmt = (face * couponPct) / 100 / perYear
  const annuity = i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i
  return { price: pmt * annuity + face * Math.pow(1 + i, -n), pmt, n, perPeriodRate: i, zero: false }
}

/** Price across a range of market rates, for the price-vs-rate curves. */
export function priceCurve(
  face: number,
  couponPct: number,
  perYear: number,
  years: number,
  rates: number[],
): number[] {
  return rates.map((r) => priceBond(face, couponPct, perYear, years, r).price)
}

export function rateRange(min: number, max: number, step: number): number[] {
  const out: number[] = []
  for (let r = min; r <= max + 1e-9; r += step) out.push(Number(r.toFixed(4)))
  return out
}
