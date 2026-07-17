/*
 * Paying off Debt: the amortization engine behind the installment-loan
 * lesson. A loan is a balance that accrues monthly interest and shrinks by
 * whatever part of each equal payment the interest does not consume.
 */

export interface LoanSchedule {
  /** Month indices 0..N for the balance path (month 0 is the amount borrowed). */
  x: number[]
  balance: number[]
  /** Month indices 1..N for the per-payment split. */
  splitX: number[]
  interestPart: number[]
  principalPart: number[]
  /** Payments made until the balance hits zero; Infinity when it is not cleared within the charted horizon. */
  months: number
  payment: number
  totalPaid: number
  totalInterest: number
  /** The balance did not reach zero within the charted horizon. */
  neverEnds: boolean
  /** The payment is at or below the first month's interest, so the balance truly never falls. */
  paymentBelowInterest: boolean
  /** Months actually simulated and plotted (the cap, when the loan outlives the chart). */
  plottedMonths: number
}

/** A payment at or below the first month's interest is charted over 20 years. */
const NEVER_CAP = 240
/** A payment that technically clears the loan is still cut off at 100 years. */
const HARD_CAP = 1200

/** Amortize a balance at a fixed APR under a fixed monthly payment. */
export function buildSchedule(pv: number, aprPct: number, payment: number): LoanSchedule {
  const i = aprPct / 100 / 12
  const x = [0]
  const balance = [pv]
  const splitX: number[] = []
  const interestPart: number[] = []
  const principalPart: number[] = []

  // At or below the first month's interest the balance can never fall; above
  // it the loan always clears eventually, though maybe not within the chart.
  const paymentBelowInterest = payment <= pv * i
  const cap = paymentBelowInterest ? NEVER_CAP : HARD_CAP
  let bal = pv
  let totalPaid = 0
  let totalInterest = 0
  let m = 0

  while (bal > 0.005 && m < cap) {
    m++
    const interest = bal * i
    const pay = Math.min(payment, bal + interest)
    bal = Math.max(0, bal + interest - pay)
    totalPaid += pay
    totalInterest += interest
    x.push(m)
    balance.push(bal)
    splitX.push(m)
    interestPart.push(interest)
    principalPart.push(Math.max(0, pay - interest))
  }

  const neverEnds = bal > 0.005
  return {
    x,
    balance,
    splitX,
    interestPart,
    principalPart,
    months: neverEnds ? Infinity : m,
    payment,
    totalPaid,
    totalInterest,
    neverEnds,
    paymentBelowInterest: paymentBelowInterest && neverEnds,
    plottedMonths: m,
  }
}

/** The equal monthly payment that repays a balance in exactly `years`. */
export function paymentFor(pv: number, aprPct: number, years: number): number {
  const i = aprPct / 100 / 12
  const n = Math.round(years * 12)
  if (i === 0) return pv / n
  return (pv * i) / (1 - Math.pow(1 + i, -n))
}

/** The first month's interest: the line a payment must beat to make progress. */
export function firstMonthInterest(pv: number, aprPct: number): number {
  return (pv * aprPct) / 100 / 12
}

/** Extend a series with a fill value so two schedules share one x-axis. */
export function padTo(arr: number[], length: number, fill = 0): number[] {
  return arr.length >= length ? arr : [...arr, ...new Array(length - arr.length).fill(fill)]
}
