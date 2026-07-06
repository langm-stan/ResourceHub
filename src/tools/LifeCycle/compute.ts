/*
 * The Modigliani–Brumberg life-cycle model, in its deterministic teaching form.
 *
 * An agent lives from `startAge` to `endAge`, earns a hump-shaped salary while
 * working (see below), then receives a fixed retirement income (Social
 * Security etc.) from `retireAge` on. With perfect capital markets the agent
 * picks the constant consumption whose present value equals the present value
 * of lifetime income (no bequest), which makes the wealth path hump-shaped:
 * borrow or barely save when young, accumulate through the career, spend down
 * to zero by the end.
 *
 * The earnings hump: the salary path is log-quadratic in experience (the
 * Mincer form from the lifetime-earnings literature), pinned down by three
 * numbers a reader actually knows — the starting salary, the peak salary, and
 * the age the peak arrives. Growth is fastest at the start, flattens to the
 * peak at `peakAge`, and drifts down after. Setting peakAge at or past
 * retireAge recovers a salary that rises for the whole career; setting
 * peakIncome equal to startIncome gives a flat salary.
 *
 * All quantities are REAL (inflation-adjusted); `realRate` is a real interest
 * rate. Flows happen at the end of each year of age t:
 * W_{t+1} = W_t·(1+r) + y_t − c_t, with W_start = 0 and W_end ≈ 0.
 */
import { annuityPV, paymentFromPV } from '../../lib/finance'

export interface LifeCycleState {
  startAge: number
  retireAge: number
  endAge: number
  /** Real starting salary at startAge, $/yr. */
  startIncome: number
  /** Real salary at the career peak, $/yr. Clamped to ≥ startIncome. */
  peakIncome: number
  /** Age at which the salary peaks; it drifts down after. Clamp to ≤ retireAge for a career-long rise. */
  peakAge: number
  /** Real retirement income (Social Security, pension, etc.), $/yr once it begins. */
  retirementIncome: number
  /**
   * Age retirement income begins. Social Security can start 62–70; pensions
   * can start much earlier. It simply begins at this age whatever else is
   * happening: before retirement it stacks on salary (a military pension
   * alongside a second career), and retiring before it begins leaves
   * zero-income years that savings must carry.
   */
  ssStartAge: number
  /** Real interest rate, %/yr. */
  realRatePct: number
  /** If true, the agent cannot borrow (wealth may never go negative). */
  noBorrowing: boolean
}

export interface LifeCyclePoint {
  age: number
  income: number
  consumption: number
  /** Wealth at the START of this age-year (before the year's flows). */
  wealth: number
  saving: number
}

export interface LifeCycleResults {
  points: LifeCyclePoint[]
  /** The smoothed consumption level over the unconstrained years. */
  smoothedConsumption: number
  peakWealth: number
  peakWealthAge: number
  finalSalary: number
  /** Highest salary on the working-years path. */
  peakIncome: number
  /** Age at which the salary peaks. */
  peakIncomeAge: number
  /** Present value of lifetime income at startAge. */
  lifetimeIncomePV: number
  /** Ages where the no-borrowing constraint binds (consumption = income). */
  constrainedYears: number
  /** Most negative wealth on the unconstrained path (0 if never negative). */
  maxDebt: number
  /** |terminal wealth| — should be ~0; kept for verification. */
  terminalWealthError: number
}

/**
 * The working-years salary path: ln y(x) = ln y₀ + b·x − c·x² with x = years
 * of experience. The peak lands at x* = b/2c; choosing c = b/(2·span) puts it
 * exactly at peakAge, and b is set so y(span) = peakIncome exactly. The
 * numbers a reader enters are the numbers the chart shows.
 */
function buildSalaryPath(state: LifeCycleState): number[] {
  const { startAge, retireAge, startIncome } = state
  const peakIncome = Math.max(state.peakIncome, startIncome)
  const span = Math.max(1, state.peakAge - startAge)
  const b = startIncome > 0 ? (2 * Math.log(peakIncome / startIncome)) / span : 0
  const c = b / (2 * span)
  const salaries: number[] = []
  for (let age = startAge; age < retireAge; age++) {
    const x = age - startAge
    salaries.push(startIncome * Math.exp(b * x - c * x * x))
  }
  return salaries
}

/**
 * Annuitize resources over n remaining years: the constant end-of-year
 * consumption whose present value equals `resources`.
 */
function annuitize(resources: number, r: number, n: number): number {
  if (n <= 0) return 0
  return paymentFromPV(Math.max(resources, 0), r, n) * Math.sign(resources || 1)
}

export function computeLifeCycle(state: LifeCycleState): LifeCycleResults {
  const salaries = buildSalaryPath(state)
  const incomes: number[] = []
  for (let age = state.startAge; age < state.endAge; age++) {
    const salary = age < state.retireAge ? (salaries[age - state.startAge] ?? 0) : 0
    const pension = age >= state.ssStartAge ? state.retirementIncome : 0
    incomes.push(salary + pension)
  }
  return computeFromIncomes(incomes, state.startAge, state.realRatePct, state.noBorrowing, {
    finalSalary: salaries[salaries.length - 1] ?? 0,
  })
}

/**
 * Core solver over an explicit income path — used directly by the case-study
 * scenario (an NFL-style income spike) where income isn't salary-shaped.
 */
export function computeFromIncomes(
  incomes: number[],
  startAge: number,
  realRatePct: number,
  noBorrowing: boolean,
  opts: { finalSalary?: number } = {}
): LifeCycleResults {
  const r = realRatePct / 100
  const T = incomes.length

  // PV at startAge of all lifetime income (end-of-year flows).
  const pvIncome = incomes.reduce((s, y, k) => s + y / Math.pow(1 + r, k + 1), 0)

  const points: LifeCyclePoint[] = []
  let wealth = 0
  let constrainedYears = 0
  let maxDebt = 0

  for (let k = 0; k < T; k++) {
    const age = startAge + k
    const y = incomes[k]

    // Remaining lifetime resources, valued at the start of this year:
    // current wealth plus the PV of income still to come.
    const pvRemaining = incomes
      .slice(k)
      .reduce((s, inc, j) => s + inc / Math.pow(1 + r, j + 1), 0)
    let c = annuitize(wealth + pvRemaining, r, T - k)

    // No-borrowing constraint: with zero wealth and desired consumption above
    // income, the agent simply consumes their income (they cannot borrow the
    // difference). Once income catches up, smoothing takes over for good.
    if (noBorrowing && wealth <= 1e-9 && c > y) {
      c = y
      constrainedYears++
    }

    points.push({ age, income: y, consumption: c, wealth, saving: y - c })
    wealth = wealth * (1 + r) + y - c
    if (wealth < maxDebt) maxDebt = wealth
  }

  const peak = points.reduce((best, p) => (p.wealth > best.wealth ? p : best), points[0])
  const smoothed = points[points.length - 1]?.consumption ?? 0
  let peakIncomeIdx = 0
  incomes.forEach((inc, i) => {
    if (inc > incomes[peakIncomeIdx]) peakIncomeIdx = i
  })

  return {
    points,
    smoothedConsumption: smoothed,
    peakWealth: peak.wealth,
    peakWealthAge: peak.age,
    finalSalary: opts.finalSalary ?? incomes[0] ?? 0,
    peakIncome: incomes[peakIncomeIdx] ?? 0,
    peakIncomeAge: startAge + peakIncomeIdx,
    lifetimeIncomePV: pvIncome,
    constrainedYears,
    maxDebt: Math.min(0, maxDebt),
    terminalWealthError: Math.abs(wealth),
  }
}

/**
 * Simulate a CHOSEN spending path instead of the optimal one — the failure
 * mode the NFL case teaches. With `debtLimit` = 0 (default), spending simply
 * cannot exceed savings plus income, so consumption crashes to the income
 * line when the money runs out. With a positive `debtLimit`, spending
 * continues on borrowed money (net worth goes negative, charged the same
 * rate) until debts hit the limit; that year the household files for
 * bankruptcy: `brokeAge` records it, remaining debt is discharged (net worth
 * resets to zero), and with no credit afterward consumption equals income.
 */
export function simulateConsumptionPath(
  incomes: number[],
  desiredConsumption: number[],
  startAge: number,
  realRatePct: number,
  opts: { debtLimit?: number } = {}
): { points: LifeCyclePoint[]; brokeAge: number | null } {
  const r = realRatePct / 100
  const debtLimit = Math.max(0, opts.debtLimit ?? 0)
  const points: LifeCyclePoint[] = []
  let wealth = 0
  let brokeAge: number | null = null
  let bankrupt = false

  for (let k = 0; k < incomes.length; k++) {
    const age = startAge + k
    const y = incomes[k]
    let c = desiredConsumption[k] ?? 0
    if (bankrupt) {
      c = Math.min(c, y)
    } else {
      const available = wealth * (1 + r) + y + debtLimit
      if (c > available) {
        c = Math.max(available, 0)
        brokeAge = age
        bankrupt = true
      }
    }
    points.push({ age, income: y, consumption: c, wealth, saving: y - c })
    wealth = wealth * (1 + r) + y - c
    // Filing year: whatever debt remains is discharged.
    if (bankrupt && wealth < 0) wealth = 0
  }

  return { points, brokeAge }
}

/** PV of a constant consumption stream — exported for the "math" tab. */
export function consumptionPV(c: number, ratePct: number, years: number): number {
  return annuityPV(c, ratePct / 100, years)
}
