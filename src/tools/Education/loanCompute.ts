/*
 * Student loans. A subsidized loan charges no interest while the borrower is
 * in school or in the grace period; an unsubsidized one charges it the whole
 * time and adds it to the balance before repayment starts. The gap between
 * the two is the value of the subsidy, and because the subsidized borrower
 * holds the money for years before paying anything, the rate actually paid
 * over the life of the loan is lower than the rate printed on it.
 */

export interface LoanInputs {
  principal: number
  aprPct: number
  /** Years enrolled, when a subsidized loan charges nothing. */
  yearsInSchool: number
  /** Months of grace after leaving, expressed in years. */
  graceYears: number
  /** Years of repayment once it begins. */
  repayYears: number
  /** Payments a year: 1 matches the classroom example, 12 matches a real loan. */
  periodsPerYear: 1 | 12
}

export interface LoanOutcome {
  subsidized: boolean
  /** What is owed on the day the first payment is due. */
  balanceAtRepayment: number
  /** Interest added before repayment begins. */
  interestBeforeRepayment: number
  payment: number
  totalPaid: number
  totalInterest: number
  /**
   * The rate that equates the money borrowed today with the payments made
   * later. On a subsidized loan the years of silence pull this below the
   * printed rate.
   */
  impliedAnnualRate: number
  /** Balance year by year, from the day the money arrives to the last payment. */
  balancePath: { year: number; balance: number }[]
}

export interface LoanComparison {
  subsidized: LoanOutcome
  unsubsidized: LoanOutcome
  /** What the subsidy is worth in total payments. */
  subsidyValue: number
  deferYears: number
}

/** Level payment that clears a balance over n periods at rate i. */
function levelPayment(balance: number, i: number, n: number): number {
  if (n <= 0) return 0
  if (i === 0) return balance / n
  return (balance * i) / (1 - Math.pow(1 + i, -n))
}

/**
 * The periodic rate at which the payments are worth exactly the amount
 * borrowed. Value falls as the rate rises, so the crossing is found by
 * halving the interval.
 */
function impliedRate(principal: number, payment: number, defer: number, pay: number): number {
  const value = (x: number) => {
    let sum = 0
    for (let k = defer + 1; k <= defer + pay; k++) sum += payment / Math.pow(1 + x, k)
    return sum - principal
  }
  let low = -0.9
  let high = 5
  if (value(low) * value(high) > 0) return 0
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    const v = value(mid)
    if (Math.abs(v) < 1e-10) return mid
    if (value(low) * v <= 0) high = mid
    else low = mid
  }
  return (low + high) / 2
}

function outcome(inputs: LoanInputs, subsidized: boolean): LoanOutcome {
  const { principal, aprPct, yearsInSchool, graceYears, repayYears, periodsPerYear } = inputs
  const i = aprPct / 100 / periodsPerYear
  const deferPeriods = Math.round((yearsInSchool + graceYears) * periodsPerYear)
  const payPeriods = Math.round(repayYears * periodsPerYear)

  const balanceAtRepayment = subsidized ? principal : principal * Math.pow(1 + i, deferPeriods)
  const payment = levelPayment(balanceAtRepayment, i, payPeriods)
  const totalPaid = payment * payPeriods

  // The balance across the whole life, sampled once a year for the chart.
  const path: { year: number; balance: number }[] = []
  let balance = principal
  const totalPeriods = deferPeriods + payPeriods
  for (let k = 0; k <= totalPeriods; k++) {
    if (k % periodsPerYear === 0) path.push({ year: k / periodsPerYear, balance: Math.max(0, balance) })
    if (k === totalPeriods) break
    if (k < deferPeriods) balance = subsidized ? balance : balance * (1 + i)
    else balance = balance * (1 + i) - payment
  }

  const periodic = impliedRate(principal, payment, deferPeriods, payPeriods)
  return {
    subsidized,
    balanceAtRepayment,
    interestBeforeRepayment: balanceAtRepayment - principal,
    payment,
    totalPaid,
    totalInterest: totalPaid - principal,
    impliedAnnualRate: Math.pow(1 + periodic, periodsPerYear) - 1,
    balancePath: path,
  }
}

export function compareLoans(inputs: LoanInputs): LoanComparison {
  const subsidized = outcome(inputs, true)
  const unsubsidized = outcome(inputs, false)
  return {
    subsidized,
    unsubsidized,
    subsidyValue: unsubsidized.totalPaid - subsidized.totalPaid,
    deferYears: inputs.yearsInSchool + inputs.graceYears,
  }
}
