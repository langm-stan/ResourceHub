/**
 * Annuities, loan payments, and amortization. Works in per-period terms:
 * `i` is the rate per period, `n` the number of periods.
 */
import { assert, assertFinite, assertNonNegative, assertPositive } from './assert'
import type { Timing } from './types'

function dueFactor(i: number, timing: Timing): number {
  return timing === 'due' ? 1 + i : 1
}

/** Future value of a stream of level payments. */
export function annuityFV(
  pmt: number,
  i: number,
  n: number,
  timing: Timing = 'ordinary',
): number {
  assertFinite(pmt, 'payment')
  assertFinite(i, 'periodic rate')
  assertNonNegative(n, 'number of periods')

  if (i === 0) return pmt * n
  const base = (pmt * (Math.pow(1 + i, n) - 1)) / i
  return base * dueFactor(i, timing)
}

/** Present value of a stream of level payments. */
export function annuityPV(
  pmt: number,
  i: number,
  n: number,
  timing: Timing = 'ordinary',
): number {
  assertFinite(pmt, 'payment')
  assertFinite(i, 'periodic rate')
  assertNonNegative(n, 'number of periods')

  if (i === 0) return pmt * n
  const base = (pmt * (1 - Math.pow(1 + i, -n))) / i
  return base * dueFactor(i, timing)
}

/** Payment that pays off a present value (loan) over n periods. */
export function paymentFromPV(
  pv: number,
  i: number,
  n: number,
  timing: Timing = 'ordinary',
): number {
  assertFinite(pv, 'present value')
  assertFinite(i, 'periodic rate')
  assertPositive(n, 'number of periods')

  if (i === 0) return pv / n
  const base = (pv * i) / (1 - Math.pow(1 + i, -n))
  return base / dueFactor(i, timing)
}

/** Payment needed to reach a future-value goal (saving for a down payment). */
export function paymentFromFV(
  fv: number,
  i: number,
  n: number,
  timing: Timing = 'ordinary',
): number {
  assertFinite(fv, 'future value')
  assertFinite(i, 'periodic rate')
  assertPositive(n, 'number of periods')

  if (i === 0) return fv / n
  const base = (fv * i) / (Math.pow(1 + i, n) - 1)
  return base / dueFactor(i, timing)
}

export interface AmortRow {
  period: number
  payment: number
  interest: number
  principal: number
  balanceStart: number
  balanceEnd: number
  cumulativeInterest: number
  cumulativePrincipal: number
}

export interface AmortSchedule {
  rows: AmortRow[]
  payment: number
  totalInterest: number
  totalPaid: number
}

/** Full amortization schedule for a loan. Final row reconciles to close at 0. */
export function amortizationSchedule(
  principal: number,
  i: number,
  n: number,
  opts: { extraPayment?: number } = {},
): AmortSchedule {
  assertPositive(principal, 'principal')
  assertNonNegative(i, 'periodic rate')
  assertPositive(n, 'number of periods')

  const extra = opts.extraPayment ?? 0
  assertNonNegative(extra, 'extra payment')

  const scheduledPayment = paymentFromPV(principal, i, n)
  const rows: AmortRow[] = []

  let balance = principal
  let cumulativeInterest = 0
  let cumulativePrincipal = 0

  for (let period = 1; period <= n && balance > 1e-9; period++) {
    const interest = balance * i
    let payment = scheduledPayment + extra
    let principalPaid = payment - interest

    if (principalPaid >= balance) {
      principalPaid = balance
      payment = principalPaid + interest
    }

    const balanceStart = balance
    balance = balanceStart - principalPaid
    if (Math.abs(balance) < 1e-9) balance = 0

    cumulativeInterest += interest
    cumulativePrincipal += principalPaid

    rows.push({
      period,
      payment,
      interest,
      principal: principalPaid,
      balanceStart,
      balanceEnd: balance,
      cumulativeInterest,
      cumulativePrincipal,
    })
  }

  const totalInterest = cumulativeInterest
  const totalPaid = cumulativePrincipal + cumulativeInterest

  assert(
    Math.abs(cumulativePrincipal - principal) < 1e-6,
    'amortization failed to repay the full principal. Check inputs.',
  )

  return { rows, payment: scheduledPayment, totalInterest, totalPaid }
}
