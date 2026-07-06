/**
 * Pure mortgage and housing math. No React, no formatting — the page and the
 * charts consume these results. Tax pieces reuse the Taxes tool's engine so
 * the two lessons never disagree about a bracket.
 */
import { amortizationSchedule, paymentFromPV } from '../../lib/finance'
import { computeIncomeTax } from '../Taxes/compute'
import { STANDARD_DEDUCTION, type FilingStatus } from '../Taxes/data2026'
import {
  AFFORDABILITY,
  COSTS,
  CREDIT_TIERS,
  MORTGAGE_INTEREST_CAP,
  RATES,
  SALT,
  type CreditTier,
} from './data2026'

export type TermYears = 15 | 30

/** The fixed rate the tool quotes for a credit tier and term. */
export function rateFor(tier: CreditTier, term: TermYears): number {
  const bump = CREDIT_TIERS.find((t) => t.key === tier)!.bump
  const base = term === 15 ? RATES.base30 - RATES.term15Discount : RATES.base30
  return base + bump
}

export interface YearRow {
  /** Year of the loan, 1-based. */
  year: number
  /** Interest paid during this year. */
  interest: number
  /** Principal paid off during this year. */
  principal: number
  /** Balance remaining at the end of this year. */
  balance: number
}

export interface MortgageResult {
  price: number
  downPct: number
  downPayment: number
  loan: number
  /** Annual rate as a decimal. */
  rate: number
  termYears: TermYears
  /** Monthly principal + interest. */
  pi: number
  propertyTaxMonthly: number
  insuranceMonthly: number
  pmiMonthly: number
  hasPmi: boolean
  /** The all-in monthly cost: P&I + property tax + insurance + PMI. */
  piti: number
  /** Interest paid over the whole loan (principal and interest only). */
  totalInterest: number
  firstMonthInterest: number
  firstMonthPrincipal: number
  /** Interest paid in the first 12 months (for the tax deduction). */
  interestYear1: number
  years: YearRow[]
  /** First year in which principal paid exceeds interest paid, or null. */
  crossoverYear: number | null
}

export function computeMortgage(
  price: number,
  downPct: number,
  rate: number,
  termYears: TermYears
): MortgageResult {
  const downPayment = price * downPct
  const loan = Math.max(0, price - downPayment)
  const propertyTaxMonthly = (price * COSTS.propertyTaxRate) / 12
  const insuranceMonthly = (price * COSTS.insuranceRate) / 12
  const hasPmi = loan > 0 && downPct < COSTS.pmiThreshold
  const pmiMonthly = hasPmi ? (loan * COSTS.pmiRate) / 12 : 0

  if (loan <= 0) {
    return {
      price, downPct, downPayment, loan: 0, rate, termYears,
      pi: 0, propertyTaxMonthly, insuranceMonthly, pmiMonthly: 0, hasPmi: false,
      piti: propertyTaxMonthly + insuranceMonthly,
      totalInterest: 0, firstMonthInterest: 0, firstMonthPrincipal: 0,
      interestYear1: 0, years: [], crossoverYear: null,
    }
  }

  const n = termYears * 12
  const i = rate / 12
  const sched = amortizationSchedule(loan, i, n)

  const years: YearRow[] = []
  for (let yr = 1; yr <= termYears; yr++) {
    const rows = sched.rows.slice((yr - 1) * 12, yr * 12)
    if (rows.length === 0) break
    years.push({
      year: yr,
      interest: rows.reduce((s, r) => s + r.interest, 0),
      principal: rows.reduce((s, r) => s + r.principal, 0),
      balance: rows[rows.length - 1]!.balanceEnd,
    })
  }

  const first = sched.rows[0]!
  return {
    price,
    downPct,
    downPayment,
    loan,
    rate,
    termYears,
    pi: sched.payment,
    propertyTaxMonthly,
    insuranceMonthly,
    pmiMonthly,
    hasPmi,
    piti: sched.payment + propertyTaxMonthly + insuranceMonthly + pmiMonthly,
    totalInterest: sched.totalInterest,
    firstMonthInterest: first.interest,
    firstMonthPrincipal: first.principal,
    interestYear1: years[0]?.interest ?? 0,
    years,
    crossoverYear: years.find((y) => y.principal > y.interest)?.year ?? null,
  }
}

export interface AffordabilityResult {
  /** 28% of monthly income: the ceiling on housing costs alone. */
  maxHousingMonthly: number
  /** 36% of monthly income minus existing debt payments. */
  maxTotalMonthly: number
  /** Which of the two ceilings binds. */
  binding: 'housing' | 'debts'
  /** The smaller ceiling: the monthly housing cost a lender allows. */
  maxMonthly: number
  /** Monthly housing cost per dollar of home price, at these terms. */
  costPerDollar: number
  /** The most expensive home the binding ceiling supports. */
  maxPrice: number
}

/**
 * Invert the 28/36 rule: from income and debts to a maximum price. Every
 * monthly cost scales linearly with price, so price = ceiling ÷ cost-per-dollar.
 */
export function computeAffordability(
  incomeYr: number,
  monthlyDebts: number,
  rate: number,
  termYears: TermYears,
  downPct: number
): AffordabilityResult {
  const monthlyIncome = incomeYr / 12
  const maxHousingMonthly = AFFORDABILITY.housingRatio * monthlyIncome
  const maxTotalMonthly = Math.max(0, AFFORDABILITY.totalRatio * monthlyIncome - monthlyDebts)
  const binding = maxTotalMonthly < maxHousingMonthly ? 'debts' : 'housing'
  const maxMonthly = Math.min(maxHousingMonthly, maxTotalMonthly)

  const loanShare = 1 - downPct
  const n = termYears * 12
  const i = rate / 12
  const costPerDollar =
    (loanShare > 0 ? paymentFromPV(loanShare, i, n) : 0) +
    (COSTS.propertyTaxRate + COSTS.insuranceRate) / 12 +
    (loanShare > 0 && downPct < COSTS.pmiThreshold ? (COSTS.pmiRate * loanShare) / 12 : 0)

  return {
    maxHousingMonthly,
    maxTotalMonthly,
    binding,
    maxMonthly,
    costPerDollar,
    maxPrice: costPerDollar > 0 ? maxMonthly / costPerDollar : 0,
  }
}

export interface HomeTaxResult {
  interestYear1: number
  /** Interest on loan balances above $750,000 is not deductible. */
  deductibleInterest: number
  propertyTaxYear: number
  /** The SALT cap after the high-income phase-down. */
  saltCap: number
  saltAllowed: number
  itemized: number
  standard: number
  /** True when the home pushes itemized deductions past the standard one. */
  itemizes: boolean
  taxStandard: number
  taxItemized: number
  /** Income tax saved in year one by owning, versus taking the standard deduction. */
  saved: number
  marginalRate: number
}

/** Year-one federal income tax with and without the home's deductions. */
export function computeHomeTaxes(
  incomeYr: number,
  status: FilingStatus,
  m: MortgageResult
): HomeTaxResult {
  const deductibleInterest =
    m.loan > MORTGAGE_INTEREST_CAP
      ? m.interestYear1 * (MORTGAGE_INTEREST_CAP / m.loan)
      : m.interestYear1
  const propertyTaxYear = m.price * COSTS.propertyTaxRate
  const saltCap = Math.max(
    SALT.floor,
    SALT.cap - SALT.phaseOutRate * Math.max(0, incomeYr - SALT.phaseOutStart)
  )
  const saltAllowed = Math.min(propertyTaxYear, saltCap)
  const itemized = deductibleInterest + saltAllowed
  const standard = STANDARD_DEDUCTION[status]

  const std = computeIncomeTax(Math.max(0, incomeYr - standard), status)
  const item = computeIncomeTax(Math.max(0, incomeYr - Math.max(standard, itemized)), status)

  return {
    interestYear1: m.interestYear1,
    deductibleInterest,
    propertyTaxYear,
    saltCap,
    saltAllowed,
    itemized,
    standard,
    itemizes: itemized > standard,
    taxStandard: std.tax,
    taxItemized: item.tax,
    saved: std.tax - item.tax,
    marginalRate: std.marginalRate,
  }
}
