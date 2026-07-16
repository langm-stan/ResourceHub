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
 * taxed on the way in (at today's rate, since the wages are earned now) and
 * on each year's returns; the traditional jar is taxed once at withdrawal
 * (rows show its after-tax value); the Roth jar is taxed once on the way in.
 *
 * The taxable jar's yearly return tax uses the retirement rate, not today's:
 * its gains accrue over a whole career toward the same rate environment the
 * traditional jar retires into, so charging the low current rate would let
 * "taxed twice" beat "taxed once at a higher rate" whenever rates rise.
 */
export function jarSeries(earn: number, years: number, ret: number, taxNow: number, taxLater: number): JarRow[] {
  const rows: JarRow[] = []
  let taxable = 0
  let trad = 0
  let roth = 0
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      taxable = taxable * (1 + ret * (1 - taxLater)) + earn * (1 - taxNow)
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
export const RETIRE_AGE = 65
/** The worked example's couple starts saving at 30, so 35 years to 65. */
export const PLAN_START_AGE = 30

/** Present value of `years` of $1-a-year withdrawals at rate r. */
function annuityFactor(r: number, years = RETIREMENT_YEARS): number {
  return (1 - Math.pow(1 + r, -years)) / r
}

/** Step 1 of the two-step method: the savings that fund a retirement income. */
export function retirementTarget(income: number, years = RETIREMENT_YEARS, r = R_RETIRED): number {
  return income * annuityFactor(r, years)
}

/** Step 2: the level end-of-year saving that grows to `target` in `years`. */
export function savingFor(target: number, years: number, r = R_SAVE): number {
  return (target * r) / (Math.pow(1 + r, years) - 1)
}

/** Annual saving that reaches `target` by RETIRE_AGE, for each starting age. */
export function waitingCurve(target: number, r = R_SAVE): { age: number; saving: number }[] {
  const rows: { age: number; saving: number }[] = []
  for (let age = START_AGE; age <= 45; age++) {
    rows.push({ age, saving: savingFor(target, RETIRE_AGE - age, r) })
  }
  return rows
}

export interface PlanRow {
  age: number
  plan: number
  actual: number
}

/**
 * The couple's plan under the planned 7% and under an actual return. The
 * saving is a whole-dollar amount, and when markets return less than
 * planned while saving, the safer withdrawal portfolio is assumed to earn
 * less by the same margin.
 */
export function planOutcome(
  income: number,
  actualR: number,
  retiredYears = RETIREMENT_YEARS,
  plannedRetiredR = R_RETIRED,
  plannedR = R_SAVE,
  startAge = PLAN_START_AGE
) {
  const target = retirementTarget(income, retiredYears, plannedRetiredR)
  const years = RETIRE_AGE - startAge
  const saving = Math.round(savingFor(target, years, plannedR))
  const rows: PlanRow[] = []
  let plan = 0
  let actual = 0
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      plan = plan * (1 + plannedR) + saving
      actual = actual * (1 + actualR) + saving
    }
    rows.push({ age: startAge + y, plan, actual })
  }
  const retiredR = Math.max(0.005, plannedRetiredR - (plannedR - actualR))
  const actualIncome = actual / annuityFactor(retiredR, retiredYears)
  return { target, saving, rows, actualBalance: actual, retiredR, actualIncome }
}

/**
 * Working years until savings can fund `retiredYears` of current spending,
 * under the same returns as the plan above.
 * Returns null when the savings rate never gets there within 75 years.
 */
export function yearsToFree(
  income: number,
  savingsRate: number,
  saveR = R_SAVE,
  retiredR = R_RETIRED,
  retiredYears = RETIREMENT_YEARS
): number | null {
  const save = income * savingsRate
  const spend = income - save
  if (save <= 0) return null
  const target = spend * annuityFactor(retiredR, retiredYears)
  let bal = 0
  let y = 0
  while (bal < target && y < 75) {
    bal = bal * (1 + saveR) + save
    y++
  }
  return y >= 75 ? null : y
}

/** Working years until free, for each savings rate from 5% to 70%. */
export function retirementCurve(
  income: number,
  saveR = R_SAVE,
  retiredR = R_RETIRED,
  retiredYears = RETIREMENT_YEARS
): { rate: number; years: number }[] {
  const rows: { rate: number; years: number }[] = []
  for (let s = 5; s <= 70; s++) {
    const y = yearsToFree(income, s / 100, saveR, retiredR, retiredYears)
    if (y !== null) rows.push({ rate: s, years: y })
  }
  return rows
}
