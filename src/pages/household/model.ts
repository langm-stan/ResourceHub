import {
  annualAverages,
  annualGrowth,
  asOf,
  payment,
  series,
  stats,
  worstDrawdown,
  yearOfInterest,
  yearOverYear,
  yearsBefore,
  type Obs,
} from '../../data/household/compute'

/*
 * Every figure on the Household Finance Data page, computed once when the
 * page's code loads. The page itself only lays these out.
 *
 * The worked examples use the same amounts as the tools they lead to, so a
 * teacher moving between them sees the same numbers: a $10,000 card balance
 * (Paying off Debt), a $40,000 car over 60 months (Used vs. New and Your
 * FICO Score), 20% down on a home (Buying a Home).
 */

export const CARD_BALANCE = 10_000
export const CAR_LOAN = 40_000
export const CAR_MONTHS = 60
export const DOWN_SHARE = 0.2
export const TANK_GALLONS = 15
export const SP_STAKE = 10_000

/* ---------------------------- Borrowing ---------------------------- */

const mortgage = series('MORTGAGE30US')
const newHome = series('MSPUS')
const latestHome = newHome[newHome.length - 1]!
const homeLoan = Math.round(latestHome.v * (1 - DOWN_SHARE))

export const MORTGAGE = (() => {
  const s = stats(mortgage)
  const pay = (rate: number) => payment(homeLoan, rate, 360)
  return {
    obs: mortgage,
    stats: s,
    home: latestHome,
    loan: homeLoan,
    payNow: pay(s.latest.v),
    payLow: pay(s.low.v),
    payHigh: pay(s.high.v),
  }
})()

const cardRate = series('TERMCBCCINTNS')
export const CARD = (() => {
  const s = stats(cardRate)
  return {
    obs: cardRate,
    stats: s,
    interestNow: yearOfInterest(CARD_BALANCE, s.latest.v),
    interestTenYearsAgo: s.tenYearsAgo ? yearOfInterest(CARD_BALANCE, s.tenYearsAgo.v) : undefined,
  }
})()

const carRate = series('RIFLPBCIANM60NM')
export const CAR = (() => {
  const s = stats(carRate)
  const interest = (rate: number) => payment(CAR_LOAN, rate, CAR_MONTHS) * CAR_MONTHS - CAR_LOAN
  return { obs: carRate, stats: s, interestNow: interest(s.latest.v), interestLow: interest(s.low.v) }
})()

const delinquency = series('DRCCLACBS')
export const DELINQUENCY = { obs: delinquency, stats: stats(delinquency) }

/* Millions of dollars in the source; trillions on the page. */
const studentLoans = series('SLOASM').map((o) => ({ ...o, v: o.v / 1e6 }))
export const STUDENT = (() => {
  const s = stats(studentLoans)
  return { obs: studentLoans, stats: s, multiple: s.latest.v / s.first.v }
})()

/* ------------------------------ Prices ------------------------------ */

const cpi = series('CPIAUCSL')
const latestCpi = cpi[cpi.length - 1]!
const inflation = yearOverYear(cpi)

export const INFLATION = (() => {
  const s = stats(inflation)
  const tenBack = asOf(cpi, yearsBefore(latestCpi.date, 10))!
  return {
    obs: inflation,
    stats: s,
    tenYearsAgoDate: tenBack.date,
    /** What $100 of goods ten years ago costs now. */
    hundredThen: (100 * latestCpi.v) / tenBack.v,
  }
})()

/* Gasoline at the time, and the same prices in the latest month's dollars. */
const gas = series('APU000074714')
const cpiByMonth = new Map(cpi.map((o) => [o.date.getTime(), o.v]))
const gasReal: Obs[] = gas
  .filter((o) => cpiByMonth.has(o.date.getTime()))
  .map((o) => ({ ...o, v: (o.v * latestCpi.v) / cpiByMonth.get(o.date.getTime())! }))

export const GAS = (() => {
  const s = stats(gas)
  const realPeak = gasReal.reduce((a, b) => (b.v > a.v ? b : a))
  const nominalAtRealPeak = gas.find((o) => o.x === realPeak.x)!
  return {
    obs: gas,
    real: gasReal,
    stats: s,
    tank: s.latest.v * TANK_GALLONS,
    realPeak,
    nominalAtRealPeak,
    /** The month whose dollars the adjusted line is in. */
    priceDate: latestCpi.date,
  }
})()

/*
 * Prices and income on one scale, 2000 = 100, from calendar-year averages
 * so the monthly, quarterly and annual series line up.
 */
export const BASE_YEAR = 2000

const incomeNominal = series('MEHOINUSA646N')
const indexSources = [
  { key: 'rent', label: 'Rent', perYear: 12, obs: series('CUSR0000SEHA'), color: 'var(--c-accent)' },
  { key: 'home', label: 'New home price', perYear: 4, obs: newHome, color: 'var(--c-series-2)' },
  { key: 'food', label: 'Food at home', perYear: 12, obs: series('CUSR0000SAF11'), color: 'var(--c-series-1)' },
  { key: 'cpi', label: 'All consumer prices', perYear: 12, obs: cpi, color: 'var(--c-series-3)' },
  { key: 'income', label: 'Household income', perYear: 1, obs: incomeNominal, color: 'var(--c-series-5)' },
] as const

export const SINCE_2000 = (() => {
  const averages = indexSources.map((s) => annualAverages(s.obs, s.perYear))
  const lastYear = Math.min(...averages.map((a) => Math.max(...a.keys())))
  const lines = indexSources.map((s, i) => {
    const a = averages[i]!
    const base = a.get(BASE_YEAR)!
    const obs: Obs[] = []
    for (let y = BASE_YEAR; y <= lastYear; y++) {
      const v = a.get(y)
      if (v !== undefined) obs.push({ date: new Date(Date.UTC(y, 0, 1)), x: y, v: (100 * v) / base })
    }
    const rise = obs[obs.length - 1]!.v - 100
    return { key: s.key, label: s.label, color: s.color, obs, rise }
  })
  const rise = Object.fromEntries(lines.map((l) => [l.key, l.rise])) as Record<
    (typeof indexSources)[number]['key'],
    number
  >
  return { lines, lastYear, rise }
})()

export const HOME_PRICE = (() => {
  const s = stats(newHome)
  return { obs: newHome, stats: s }
})()

/* The median new home in years of the median household's income. */
export const PRICE_TO_INCOME = (() => {
  const homeYears = annualAverages(newHome, 4)
  const obs: Obs[] = incomeNominal
    .filter((o) => homeYears.has(o.date.getUTCFullYear()))
    .map((o) => ({ ...o, v: homeYears.get(o.date.getUTCFullYear())! / o.v }))
  return { obs, stats: stats(obs) }
})()

/* ------------------------- Income and saving ------------------------- */

const incomeReal = series('MEHOINUSA672N')
export const INCOME = (() => {
  const s = stats(incomeReal)
  const years = s.latest.date.getUTCFullYear() - s.first.date.getUTCFullYear()
  return {
    obs: incomeReal,
    stats: s,
    /** Census restates the series in the latest year's dollars. */
    dollarsOf: s.latest.date.getUTCFullYear(),
    totalGrowth: (s.latest.v / s.first.v - 1) * 100,
    perYear: annualGrowth(s.first.v, s.latest.v, years),
  }
})()

const debtService = series('TDSP')
export const DEBT_SERVICE = { obs: debtService, stats: stats(debtService) }

const saving = series('PSAVERT')
export const SAVING = { obs: saving, stats: stats(saving) }

/* The Treasury bill rate against inflation over the same months. */
const tbill = series('TB3MS')
export const CASH = (() => {
  const inflByMonth = new Map(inflation.map((o) => [o.date.getTime(), o.v]))
  const paired = tbill.filter((o) => inflByMonth.has(o.date.getTime()))
  const bill = paired
  const infl = paired.map((o) => ({ ...o, v: inflByMonth.get(o.date.getTime())! }))
  const latestBill = bill[bill.length - 1]!
  const latestInfl = infl[infl.length - 1]!
  const since = paired.filter((o) => o.date.getUTCFullYear() >= BASE_YEAR)
  const behind = since.filter((o) => o.v < inflByMonth.get(o.date.getTime())!).length
  return {
    bill,
    infl,
    stats: stats(bill),
    latestBill,
    latestInfl,
    /** Exact, not the difference: (1 + rate) / (1 + inflation) - 1. */
    realNow: ((1 + latestBill.v / 100) / (1 + latestInfl.v / 100) - 1) * 100,
    shareBehind: (behind / since.length) * 100,
  }
})()

const sp = series('SP500')
export const SP500 = (() => {
  const s = stats(sp)
  const years = (s.latest.date.getTime() - s.first.date.getTime()) / (365.25 * 86_400_000)
  return {
    obs: sp,
    stats: s,
    grownTo: (SP_STAKE * s.latest.v) / s.first.v,
    perYear: annualGrowth(s.first.v, s.latest.v, years),
    drawdown: worstDrawdown(sp),
  }
})()
