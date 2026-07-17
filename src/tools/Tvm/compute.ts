/**
 * Derives every figure the TVM guided modes show, reusing the tested annuity +
 * amortization functions in lib/finance.
 */
import {
  amortizationSchedule,
  growthSeries,
  paymentFromFV,
  paymentFromPV,
  type AmortSchedule,
} from '../../lib/finance'
import type { TvmState } from './state'

export interface BalancePoint {
  t: number
  balance: number
}

export interface YearRow {
  year: number
  interest: number
  principal: number
  balanceEnd: number
}

export interface TvmResults {
  mode: 'loan' | 'save'
  payment: number
  periodRate: number
  periods: number
  totalPaid: number
  totalInterest: number
  amount: number
  balanceSeries: BalancePoint[]
  yearly: YearRow[]
}

export function computeTvm(s: TvmState): TvmResults {
  const i = s.ratePct / 100 / 12
  const n = Math.max(1, Math.round(s.years * 12))

  if (s.mode === 'save') {
    const payment = paymentFromFV(s.amount, i, n)
    const totalContributed = payment * n
    const { points } = growthSeries({
      principal: 0,
      annualRate: s.ratePct / 100,
      years: s.years,
      freq: { kind: 'periodic', m: 12 },
      contribution: { amount: payment, timing: 'ordinary' },
    })
    return {
      mode: 'save',
      payment,
      periodRate: i,
      periods: n,
      totalPaid: totalContributed,
      totalInterest: s.amount - totalContributed,
      amount: s.amount,
      balanceSeries: points.map((p) => ({ t: p.t, balance: p.balance })),
      yearly: [],
    }
  }

  // Loan (default for loan + calc-fallback). A zero or negative amount (the
  // slider's minimum, or a hand-edited URL) means there is nothing to
  // amortize; return a flat zero payoff instead of asking the schedule
  // builder for an impossible loan.
  if (s.amount <= 0) {
    return {
      mode: 'loan',
      payment: 0,
      periodRate: i,
      periods: n,
      totalPaid: 0,
      totalInterest: 0,
      amount: 0,
      balanceSeries: [
        { t: 0, balance: 0 },
        { t: s.years, balance: 0 },
      ],
      yearly: [],
    }
  }

  const payment = paymentFromPV(s.amount, i, n)
  const schedule = amortizationSchedule(s.amount, i, n)
  return {
    mode: 'loan',
    payment,
    periodRate: i,
    periods: n,
    totalPaid: schedule.totalPaid,
    totalInterest: schedule.totalInterest,
    amount: s.amount,
    balanceSeries: loanBalanceSeries(s.amount, schedule),
    yearly: yearlyRows(schedule),
  }
}

function loanBalanceSeries(amount: number, schedule: AmortSchedule): BalancePoint[] {
  const pts: BalancePoint[] = [{ t: 0, balance: amount }]
  for (const row of schedule.rows) {
    pts.push({ t: row.period / 12, balance: row.balanceEnd })
  }
  return pts
}

function yearlyRows(schedule: AmortSchedule): YearRow[] {
  const rows: YearRow[] = []
  let curYear = 1
  let interest = 0
  let principal = 0
  let balanceEnd = 0
  for (const r of schedule.rows) {
    const year = Math.ceil(r.period / 12)
    if (year !== curYear) {
      rows.push({ year: curYear, interest, principal, balanceEnd })
      curYear = year
      interest = 0
      principal = 0
    }
    interest += r.interest
    principal += r.principal
    balanceEnd = r.balanceEnd
  }
  rows.push({ year: curYear, interest, principal, balanceEnd })
  return rows
}
