/*
 * Your FICO Score: loan-cost math. Pure functions, no React.
 * Same amortization convention as the sibling car tools (monthly compounding,
 * nothing down).
 */

export function monthlyPayment(loan: number, apr: number, months: number): number {
  const i = apr / 12
  return (loan * i) / (1 - (1 + i) ** -months)
}

export interface LoanCost {
  payment: number
  totalPaid: number
  totalInterest: number
}

export function loanCost(loan: number, apr: number, months: number): LoanCost {
  const payment = monthlyPayment(loan, apr, months)
  return { payment, totalPaid: payment * months, totalInterest: payment * months - loan }
}

/** Future value of investing `amount` at the end of each month for `months`. */
export function fvOfMonthly(amount: number, annualRate: number, months: number): number {
  const i = annualRate / 12
  return amount * (((1 + i) ** months - 1) / i)
}
