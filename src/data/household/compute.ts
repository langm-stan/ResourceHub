import { FRED_DATA } from './fredData'

/*
 * Everything the Household Finance Data page says, computed from the FRED
 * series in ./fredData.ts. That file is rewritten before every deploy, so no
 * figure on the page is typed in: a new release moves the numbers, the
 * dates, and the sentences built from them together.
 */

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface Obs {
  date: Date
  /** Decimal year (2026.63), the x the charts plot against. */
  x: number
  v: number
}

const DAY_MS = 86_400_000

function decimalYear(d: Date): number {
  const y = d.getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  const end = Date.UTC(y + 1, 0, 1)
  return y + (d.getTime() - start) / (end - start)
}

function obs(date: Date, v: number): Obs {
  return { date, x: decimalYear(date), v }
}

export function series(id: string): Obs[] {
  const s = FRED_DATA.series[id]
  if (!s) return []
  return s.d.map((d, i) => obs(new Date(`${d}T00:00:00Z`), s.v[i]!))
}

/** The day the data were downloaded. */
export const FETCHED = new Date(`${FRED_DATA.fetched}T00:00:00Z`)

/** NBER recessions as [start, end] decimal years; the end month is included. */
export const RECESSIONS: [number, number][] = FRED_DATA.recessions.map(([a, b]) => {
  const end = new Date(`${b}T00:00:00Z`)
  const endOfMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1))
  return [decimalYear(new Date(`${a}T00:00:00Z`)), decimalYear(endOfMonth)]
})

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** How an observation's date reads for its frequency: "Sep 17, 2026", "Aug 2026", "Q2 2026", "2025". */
export function periodLabel(d: Date, f: Frequency): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  switch (f) {
    case 'weekly':
      return `${MONTHS[m]} ${d.getUTCDate()}, ${y}`
    case 'monthly':
      return `${MONTHS[m]} ${y}`
    case 'quarterly':
      return `Q${Math.floor(m / 3) + 1} ${y}`
    case 'annual':
      return String(y)
  }
}

/** The same, in running prose: "September 17, 2026", "August 2026". */
export function periodProse(d: Date, f: Frequency): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  switch (f) {
    case 'weekly':
      return `${MONTHS_LONG[m]} ${d.getUTCDate()}, ${y}`
    case 'monthly':
      return `${MONTHS_LONG[m]} ${y}`
    case 'quarterly':
      return `the ${['first', 'second', 'third', 'fourth'][Math.floor(m / 3)]} quarter of ${y}`
    case 'annual':
      return String(y)
  }
}

export const fetchedLabel = `${MONTHS_LONG[FETCHED.getUTCMonth()]} ${FETCHED.getUTCDate()}, ${FETCHED.getUTCFullYear()}`

/* ------------------------------------------------------------------ */
/* Transformations                                                     */
/* ------------------------------------------------------------------ */

const monthKey = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth()

/** Percent change from twelve months earlier, for a monthly series. */
export function yearOverYear(s: Obs[]): Obs[] {
  const byMonth = new Map(s.map((o) => [monthKey(o.date), o.v]))
  const out: Obs[] = []
  for (const o of s) {
    const prior = byMonth.get(monthKey(o.date) - 12)
    if (prior) out.push(obs(o.date, (o.v / prior - 1) * 100))
  }
  return out
}

/*
 * Calendar-year averages, complete years only. A monthly year may be one
 * month short and still count: BLS published no October 2025 CPI (the
 * government was shut down), and a year of eleven months is still the year.
 */
export function annualAverages(s: Obs[], perYear: number): Map<number, number> {
  const needed = perYear === 12 ? 11 : perYear
  const sums = new Map<number, { sum: number; n: number }>()
  for (const o of s) {
    const y = o.date.getUTCFullYear()
    const a = sums.get(y) ?? { sum: 0, n: 0 }
    a.sum += o.v
    a.n += 1
    sums.set(y, a)
  }
  const out = new Map<number, number>()
  for (const [y, a] of sums) if (a.n >= needed) out.set(y, a.sum / a.n)
  return out
}

/** The last observation on or before a date. */
export function asOf(s: Obs[], d: Date): Obs | undefined {
  let found: Obs | undefined
  for (const o of s) {
    if (o.date.getTime() > d.getTime()) break
    found = o
  }
  return found
}

export function yearsBefore(d: Date, years: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear() - years, d.getUTCMonth(), d.getUTCDate()))
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export interface SeriesStats {
  first: Obs
  latest: Obs
  yearAgo?: Obs
  tenYearsAgo?: Obs
  high: Obs
  low: Obs
  mean: number
}

export function stats(s: Obs[]): SeriesStats {
  const first = s[0]!
  const latest = s[s.length - 1]!
  let high = first
  let low = first
  let sum = 0
  for (const o of s) {
    if (o.v > high.v) high = o
    if (o.v < low.v) low = o
    sum += o.v
  }
  /* A year back must land within a few weeks of the same date, or there is
     no observation a year earlier to speak of. */
  const back = (years: number) => {
    const target = yearsBefore(latest.date, years)
    const o = asOf(s, target)
    return o && (target.getTime() - o.date.getTime()) / DAY_MS < 100 ? o : undefined
  }
  return {
    first,
    latest,
    yearAgo: back(1),
    tenYearsAgo: back(10),
    high,
    low,
    mean: sum / s.length,
  }
}

/** Monthly payment on a fully amortizing loan. Rate in percent a year. */
export function payment(principal: number, ratePct: number, months: number): number {
  const r = ratePct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - (1 + r) ** -months)
}

/** Interest added in a year to a balance nothing is paid on, compounded monthly. */
export function yearOfInterest(balance: number, ratePct: number): number {
  return balance * ((1 + ratePct / 100 / 12) ** 12 - 1)
}

/** Compound annual growth rate between two values, in percent. */
export function annualGrowth(from: number, to: number, years: number): number {
  return ((to / from) ** (1 / years) - 1) * 100
}

export interface Drawdown {
  depth: number
  peak: Obs
  trough: Obs
}

/** The largest fall from a previous high. */
export function worstDrawdown(s: Obs[]): Drawdown {
  let peak = s[0]!
  let worst: Drawdown = { depth: 0, peak, trough: peak }
  for (const o of s) {
    if (o.v > peak.v) peak = o
    const depth = o.v / peak.v - 1
    if (depth < worst.depth) worst = { depth, peak, trough: o }
  }
  return worst
}
