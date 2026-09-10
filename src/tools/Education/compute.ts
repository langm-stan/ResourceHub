/*
 * Investing in education, priced the way any other project is priced: the
 * costs and the benefits are moved to today and compared. The cost of a
 * degree is the tuition plus the income given up while studying, which is
 * the part people leave out. The benefit is the raise the degree earns,
 * every year it is earned.
 */

export type CostTiming = 'start' | 'end'

export interface EducationInputs {
  /** Years the program takes. */
  programYears: number
  /** Tuition, fees and books for one year of the program. */
  tuitionPerYear: number
  /** Income given up for one year of the program; zero if you keep working. */
  forgonePerYear: number
  /** Extra income per year once the program is finished. */
  raisePerYear: number
  /** Years the raise is earned, normally the years left until retirement. */
  yearsEarning: number
  ratePct: number
  /** Whether a year's tuition is paid at the start of that year or its end. */
  costTiming: CostTiming
}

export interface CashFlow {
  /** Years from today. */
  t: number
  /** Negative while studying, positive once the raise arrives. */
  amount: number
}

export interface EducationResult {
  flows: CashFlow[]
  costPeriods: number[]
  benefitPeriods: number[]
  costPerYear: number
  pvCosts: number
  pvBenefits: number
  npv: number
  /** The rate at which the degree exactly breaks even, or null if there is none. */
  irr: number | null
  /** The smallest raise that still repays the cost. */
  breakEvenRaise: number
  /** Present value of $1 of raise, over the years it is earned. */
  raiseFactor: number
  lastYear: number
}

/** Present value of $1 received at the end of year t. */
function discount(t: number, r: number): number {
  return 1 / Math.pow(1 + r, t)
}

function periods({ programYears, yearsEarning, costTiming }: EducationInputs) {
  const s = Math.max(0, Math.round(programYears))
  const w = Math.max(0, Math.round(yearsEarning))
  // Tuition paid up front runs from today; paid in arrears it runs from the
  // end of the first year. Either way the raise starts the period after the
  // last tuition bill.
  const first = costTiming === 'start' ? 0 : 1
  const costPeriods = Array.from({ length: s }, (_, i) => first + i)
  const benefitStart = (costPeriods[costPeriods.length - 1] ?? first - 1) + 1
  const benefitPeriods = Array.from({ length: w }, (_, i) => benefitStart + i)
  return { costPeriods, benefitPeriods }
}

/** Net present value of the whole decision at one rate. */
function npvAt(inputs: EducationInputs, r: number): number {
  const { costPeriods, benefitPeriods } = periods(inputs)
  const cost = inputs.tuitionPerYear + inputs.forgonePerYear
  const pvC = costPeriods.reduce((sum, t) => sum + cost * discount(t, r), 0)
  const pvB = benefitPeriods.reduce((sum, t) => sum + inputs.raisePerYear * discount(t, r), 0)
  return pvB - pvC
}

/*
 * The rate that sets the net present value to zero. Costs come first and
 * benefits later, so the value falls as the rate rises and a single crossing
 * can be found by halving the interval.
 */
function solveIrr(inputs: EducationInputs): number | null {
  const lo = -0.95
  const hi = 5
  let a = npvAt(inputs, lo)
  let b = npvAt(inputs, hi)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a * b > 0) return null
  let low = lo
  let high = hi
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    const v = npvAt(inputs, mid)
    if (Math.abs(v) < 1e-9) return mid
    if (a * v <= 0) {
      high = mid
      b = v
    } else {
      low = mid
      a = v
    }
  }
  return (low + high) / 2
}

export function evaluateEducation(inputs: EducationInputs): EducationResult {
  const r = inputs.ratePct / 100
  const { costPeriods, benefitPeriods } = periods(inputs)
  const costPerYear = inputs.tuitionPerYear + inputs.forgonePerYear

  const pvCosts = costPeriods.reduce((sum, t) => sum + costPerYear * discount(t, r), 0)
  const raiseFactor = benefitPeriods.reduce((sum, t) => sum + discount(t, r), 0)
  const pvBenefits = inputs.raisePerYear * raiseFactor

  const flows: CashFlow[] = [
    ...costPeriods.map((t) => ({ t, amount: -costPerYear })),
    ...benefitPeriods.map((t) => ({ t, amount: inputs.raisePerYear })),
  ].sort((x, y) => x.t - y.t)

  return {
    flows,
    costPeriods,
    benefitPeriods,
    costPerYear,
    pvCosts,
    pvBenefits,
    npv: pvBenefits - pvCosts,
    irr: solveIrr(inputs),
    breakEvenRaise: raiseFactor > 0 ? pvCosts / raiseFactor : Infinity,
    raiseFactor,
    lastYear: benefitPeriods[benefitPeriods.length - 1] ?? costPeriods[costPeriods.length - 1] ?? 0,
  }
}

/** Net present value across a range of raises, for the sensitivity chart. */
export function npvByRaise(inputs: EducationInputs, raises: number[]): number[] {
  const r = inputs.ratePct / 100
  const { costPeriods, benefitPeriods } = periods(inputs)
  const cost = inputs.tuitionPerYear + inputs.forgonePerYear
  const pvC = costPeriods.reduce((sum, t) => sum + cost * discount(t, r), 0)
  const factor = benefitPeriods.reduce((sum, t) => sum + discount(t, r), 0)
  return raises.map((raise) => raise * factor - pvC)
}

/** Net present value across a range of rates, for the sensitivity chart. */
export function npvByRate(inputs: EducationInputs, ratesPct: number[]): number[] {
  return ratesPct.map((ratePct) => npvAt({ ...inputs, ratePct }, ratePct / 100))
}
