/*
 * Retirement Planning Simulator: the math behind the four parts, ported
 * from Matt's retirement-planning-simulator.jsx prototype. Tax parameters
 * come from the vetted Taxes tool data (single source for annual updates).
 * Pure functions, no React.
 */
import { BRACKETS, FICA, STANDARD_DEDUCTION } from '../Taxes/data2026'

export { ACCOUNT_RULES, CONTRIBUTION_LIMITS, TAX_YEAR } from '../Taxes/data2026'
export const STD_DEDUCTION = STANDARD_DEDUCTION.single
export const SS_WAGE_BASE = FICA.ssWageBase

/* ------------------------ part 1: paycheck ------------------------ */

export interface BracketSlice {
  rate: number
  amount: number
  tax: number
}

export interface FederalTax {
  taxable: number
  tax: number
  marginal: number
  slices: BracketSlice[]
}

/** Federal income tax for a single filer taking the standard deduction. */
export function federalTax(gross: number): FederalTax {
  const taxable = Math.max(0, gross - STD_DEDUCTION)
  let tax = 0
  let prev = 0
  let marginal = 0
  const slices: BracketSlice[] = []
  for (const b of BRACKETS.single) {
    if (taxable > prev) {
      const amount = Math.min(taxable, b.upTo) - prev
      tax += amount * b.rate
      marginal = b.rate
      slices.push({ rate: b.rate, amount, tax: amount * b.rate })
    }
    prev = b.upTo
    if (taxable <= b.upTo) break
  }
  return { taxable, tax, marginal, slices }
}

/** Employee-side FICA (Social Security to the wage base, Medicare on all wages). */
export function fica(gross: number): number {
  const ss = FICA.ssRate * Math.min(gross, FICA.ssWageBase)
  const extra = gross > FICA.additionalMedicareThreshold.single
    ? FICA.additionalMedicareRate * (gross - FICA.additionalMedicareThreshold.single)
    : 0
  return ss + FICA.medicareRate * gross + extra
}

/* ---------------------- part 2: three jars ------------------------ */

export interface JarRow {
  year: number
  taxable: number
  traditional: number
  roth: number
}

/**
 * The same pre-tax earnings go into three jars each year. The taxable jar is
 * taxed on the way in and on each year's returns; the traditional jar is
 * taxed once at withdrawal (rows show its after-tax value); the Roth jar is
 * taxed once on the way in.
 */
export function jarSeries(earn: number, years: number, ret: number, taxNow: number, taxLater: number): JarRow[] {
  const rows: JarRow[] = []
  let taxable = 0
  let trad = 0
  let roth = 0
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      taxable = taxable * (1 + ret * (1 - taxNow)) + earn * (1 - taxNow)
      trad = trad * (1 + ret) + earn
      roth = roth * (1 + ret) + earn * (1 - taxNow)
    }
    rows.push({ year: y, taxable, traditional: trad * (1 - taxLater), roth })
  }
  return rows
}

/* --------------------- part 3: employer match --------------------- */

/** The match lands on contributions up to this share of salary. */
export const MATCH_CAP = 0.06
export const MATCH_RETURN = 0.06
export const MATCH_TAX = 0.3

export interface MatchScenarioRow {
  year: number
  taxable: number
  noMatch: number
  halfMatch: number
  fullMatch: number
}

/**
 * Four ways to save the same share of salary. The taxable account is funded
 * after tax and its returns are taxed every year. The three tax-deferred
 * scenarios grow untaxed and are taxed once at withdrawal (rows show
 * after-tax value); the match adds 50 or 100 cents per contributed dollar,
 * on contributions up to MATCH_CAP of salary.
 */
export function matchScenarios(
  salary: number,
  contribShare: number,
  years: number,
  r = MATCH_RETURN,
  tax = MATCH_TAX
): MatchScenarioRow[] {
  const contrib = contribShare * salary
  const matched = Math.min(contribShare, MATCH_CAP) * salary
  const rows: MatchScenarioRow[] = []
  let taxable = 0
  let no = 0
  let half = 0
  let full = 0
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      taxable = taxable * (1 + r * (1 - tax)) + contrib * (1 - tax)
      no = no * (1 + r) + contrib
      half = half * (1 + r) + contrib + 0.5 * matched
      full = full * (1 + r) + contrib + matched
    }
    rows.push({
      year: y,
      taxable,
      noMatch: no * (1 - tax),
      halfMatch: half * (1 - tax),
      fullMatch: full * (1 - tax),
    })
  }
  return rows
}

/* -------------------- part 4: retirement timing ------------------- */

export const START_AGE = 25
export const R_SAVE = 0.07
export const R_RETIRED = 0.035
export const RETIREMENT_YEARS = 30

/** Pile that funds 30 years of a given annual spend at the retired rate. */
const ANNUITY_FACTOR = (1 - Math.pow(1 + R_RETIRED, -RETIREMENT_YEARS)) / R_RETIRED

/**
 * Working years until savings can fund 30 years of current spending.
 * Returns null when the savings rate never gets there within 75 years.
 */
export function yearsToFree(income: number, savingsRate: number): number | null {
  const save = income * savingsRate
  const spend = income - save
  if (save <= 0) return null
  const target = spend * ANNUITY_FACTOR
  let bal = 0
  let y = 0
  while (bal < target && y < 75) {
    bal = bal * (1 + R_SAVE) + save
    y++
  }
  return y >= 75 ? null : y
}

/** Retirement age for each savings rate from 5% to 70%. */
export function retirementCurve(income: number): { rate: number; age: number }[] {
  const rows: { rate: number; age: number }[] = []
  for (let s = 5; s <= 70; s++) {
    const y = yearsToFree(income, s / 100)
    if (y !== null) rows.push({ rate: s, age: START_AGE + y })
  }
  return rows
}
