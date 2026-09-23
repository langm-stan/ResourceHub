#!/usr/bin/env node
/*
 * Refresh every FRED series the site draws on.
 *
 *   node scripts/fetch-fred.mjs
 *
 * Runs before every deploy, including the nightly one (see
 * .github/workflows/deploy.yml), and can be run by hand to commit a fresh
 * snapshot. Writes two files:
 *
 *   src/data/household/fredData.ts         Household Finance Data page
 *   src/tools/BitcoinMining/marketData.ts  Bitcoin Mining's price history
 *
 * Three rules keep a bad night from reaching the site:
 *
 * 1. New observations are MERGED into the committed ones, never swapped in
 *    wholesale. FRED keeps only the last ten years of SP500, so a straight
 *    replacement would lose a day of history every day, and the bitcoin
 *    page's comparisons from 2017 would quietly stop working.
 * 2. A download that fails, or comes back short, malformed, or ending
 *    earlier than what is already committed, is ignored for that series and
 *    the committed data stands.
 * 3. The script never exits non-zero on a data problem. A deploy with
 *    yesterday's numbers is better than no deploy.
 *
 * With FRED_API_KEY set it uses the official API; without one it reads the
 * public CSV that fred.stlouisfed.org serves for its own download button.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOUSEHOLD_FILE = join(ROOT, 'src/data/household/fredData.ts')
const MARKET_FILE = join(ROOT, 'src/tools/BitcoinMining/marketData.ts')

/* The Household Finance Data page, in the order the file lists them. */
const HOUSEHOLD_SERIES = [
  'MORTGAGE30US', // 30-year fixed mortgage rate, weekly
  'TERMCBCCINTNS', // credit card rate, accounts assessed interest
  'RIFLPBCIANM60NM', // 60-month new car loan rate
  'DRCCLACBS', // credit card delinquency rate
  'SLOASM', // student loans owned and securitized
  'CPIAUCSL', // CPI, all items
  'CUSR0000SEHA', // CPI, rent of primary residence
  'CUSR0000SAF11', // CPI, food at home
  'APU000074714', // regular gasoline, dollars per gallon
  'MSPUS', // median sales price of new houses sold
  'MEHOINUSA672N', // real median household income
  'MEHOINUSA646N', // median household income, current dollars
  'TDSP', // debt service payments, % of disposable income
  'PSAVERT', // personal saving rate
  'TB3MS', // 3-month Treasury bill rate
  'SP500', // S&P 500, kept as month-end closes
]

/* Series whose recent history is enough, to keep the page light. */
const MONTH_END_ONLY = new Set(['SP500'])

const today = new Date().toISOString().slice(0, 10)
const warnings = []
const warn = (msg) => {
  warnings.push(msg)
  console.warn(`  ! ${msg}`)
}

/* ------------------------------------------------------------------ */
/* Download                                                            */
/* ------------------------------------------------------------------ */

async function get(url) {
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 2_000 * attempt))
    }
  }
  throw lastErr
}

/** [[isoDate, value], ...] ascending, missing observations dropped. */
async function download(id) {
  const key = process.env.FRED_API_KEY
  if (key) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json`
    const json = JSON.parse(await get(url))
    return json.observations
      .filter((o) => o.value !== '.' && o.value !== '')
      .map((o) => [o.date, Number(o.value)])
  }
  const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`)
  const lines = csv.trim().split(/\r?\n/)
  if (!/^observation_date,/i.test(lines[0] ?? '')) throw new Error('not a FRED CSV')
  return lines
    .slice(1)
    .map((l) => l.split(','))
    .filter(([, v]) => v !== undefined && v !== '' && v !== '.')
    .map(([d, v]) => [d, Number(v)])
}

function validate(id, obs, committedLast) {
  if (obs.length < 20) throw new Error(`only ${obs.length} observations`)
  for (let i = 0; i < obs.length; i++) {
    const [d, v] = obs[i]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(v)) throw new Error(`bad row ${d},${v}`)
    if (i > 0 && d <= obs[i - 1][0]) throw new Error(`dates out of order at ${d}`)
  }
  const last = obs[obs.length - 1][0]
  if (committedLast && last < committedLast) {
    throw new Error(`ends ${last}, before the committed ${committedLast}`)
  }
}

/** Fresh values override committed ones on the same key; nothing is dropped. */
function merge(committed, fresh, keyOf = (d) => d) {
  const byKey = new Map()
  for (const o of committed) byKey.set(keyOf(o[0]), o)
  for (const o of fresh) byKey.set(keyOf(o[0]), o)
  return [...byKey.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

/** The last observation in each calendar month. */
function monthEnds(obs) {
  const out = new Map()
  for (const o of obs) out.set(o[0].slice(0, 7), o)
  return [...out.values()]
}

/* ------------------------------------------------------------------ */
/* Household Finance Data                                              */
/* ------------------------------------------------------------------ */

function readHousehold() {
  if (!existsSync(HOUSEHOLD_FILE)) return { series: {}, recessions: [] }
  const src = readFileSync(HOUSEHOLD_FILE, 'utf8')
  /* The object literal after "} = ", past the type annotation's braces. */
  const json = src.slice(src.indexOf('= {', src.indexOf('FRED_DATA')) + 2, src.lastIndexOf('}') + 1)
  const data = JSON.parse(json)
  const series = {}
  for (const [id, s] of Object.entries(data.series)) {
    series[id] = s.d.map((d, i) => [d, s.v[i]])
  }
  return { series, recessions: data.recessions ?? [] }
}

/*
 * NBER recessions from USREC, as [first month, last month] pairs. Only the
 * postwar ones matter: no series on the page starts before 1947.
 */
async function recessions(committed) {
  try {
    const obs = await download('USREC')
    validate('USREC', obs)
    const out = []
    let start = null
    let prev = null
    for (const [d, v] of obs) {
      if (d < '1947-01-01') continue
      if (v === 1 && start === null) start = d
      if (v === 0 && start !== null) {
        out.push([start, prev])
        start = null
      }
      prev = d
    }
    if (start !== null) out.push([start, prev])
    return out
  } catch (err) {
    warn(`USREC: ${err.message}; keeping committed recession dates`)
    return committed
  }
}

function writeHousehold(series, recs, fetched) {
  const payload = {
    fetched,
    recessions: recs,
    series: Object.fromEntries(
      HOUSEHOLD_SERIES.filter((id) => series[id]?.length).map((id) => [
        id,
        { d: series[id].map((o) => o[0]), v: series[id].map((o) => o[1]) },
      ]),
    ),
  }
  const body = JSON.stringify(payload)
    .replace(/"series":\{/, '"series":{\n')
    .replace(/\},"(?=[A-Z0-9]+":\{"d")/g, '},\n"')
  writeFileSync(
    HOUSEHOLD_FILE,
    `/*
 * GENERATED by scripts/fetch-fred.mjs. Do not edit by hand.
 *
 * Every series on the Household Finance Data page, as FRED publishes it
 * (month-end closes only for SP500). Dates are the observation dates FRED
 * gives, which for monthly and quarterly series are the first day of the
 * period. \`fetched\` is the day the download ran.
 */

export interface RawSeries {
  d: string[]
  v: number[]
}

export const FRED_DATA: {
  fetched: string
  recessions: [string, string][]
  series: Record<string, RawSeries>
} = ${body}
`,
  )
}

/* ------------------------------------------------------------------ */
/* Bitcoin Mining's price history                                       */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000

/* Halves go to the even dollar, as the file was first written, so a refresh
   leaves the committed history exactly as it was. */
function roundHalfEven(v) {
  const r = Math.round(v)
  return Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}
const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY_MS).toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)

function readMarket() {
  const src = readFileSync(MARKET_FILE, 'utf8')
  const block = (name) => src.slice(src.indexOf(`export const ${name}`))
  const field = (text, key) => {
    const m = text.match(new RegExp(`${key}: (\\[[^\\]]*\\]|'[^']*')`))
    return m[1].startsWith("'") ? m[1].slice(1, -1) : JSON.parse(m[1])
  }
  const btc = block('BTC')
  const spx = block('SPX')
  const btcStart = field(btc, 'start')
  const spxStart = field(spx, 'start')
  return {
    header: src.slice(0, src.indexOf('export const SOURCE')),
    rest: src.slice(src.indexOf('export const SOURCE'), src.indexOf('/** Daily close in dollars')),
    btc: field(btc, 'close').map((v, i) => [addDays(btcStart, i), v]),
    spx: field(spx, 'offset').map((t, i) => [addDays(spxStart, t), field(spx, 'close')[i]]),
  }
}

function writeMarket(m, btc, spx, fetched) {
  /* Bitcoin: one close per calendar day, gaps carried forward, whole
     dollars (cents on a five-figure price are noise and double the file). */
  const btcStart = btc[0][0]
  const btcLast = btc[btc.length - 1][0]
  const byDay = new Map(btc)
  const btcClose = []
  let carry = btc[0][1]
  for (let d = btcStart; d <= btcLast; d = addDays(d, 1)) {
    if (byDay.has(d)) carry = byDay.get(d)
    btcClose.push(roundHalfEven(carry))
  }
  const spxStart = spx[0][0]
  const header = m.header.replace(/Pulled \d{4}-\d{2}-\d{2}/, `Pulled ${fetched}`)
  writeFileSync(
    MARKET_FILE,
    `${header}${m.rest}/** Daily close in dollars, one per calendar day from start. */
export const BTC = {
  start: '${btcStart}',
  close: [${btcClose.join(',')}],
} as const

/** Trading-day closes, with each day's offset in days from start. */
export const SPX = {
  start: '${spxStart}',
  offset: [${spx.map((o) => daysBetween(spxStart, o[0])).join(',')}],
  close: [${spx.map((o) => o[1]).join(',')}],
} as const
`,
  )
}

/* ------------------------------------------------------------------ */

async function fresh(id, committed, keyOf) {
  try {
    let obs = await download(id)
    validate(id, obs, committed.at(-1)?.[0])
    if (MONTH_END_ONLY.has(id)) obs = monthEnds(obs)
    const merged = merge(committed, obs, keyOf)
    const last = merged.at(-1)
    console.log(`  ${id.padEnd(16)} ${String(merged.length).padStart(5)} obs, through ${last[0]}`)
    return { merged, raw: obs }
  } catch (err) {
    warn(`${id}: ${err.message}; keeping the committed ${committed.length} observations`)
    return { merged: committed, raw: null }
  }
}

async function main() {
  console.log(`Refreshing FRED series (${process.env.FRED_API_KEY ? 'API' : 'public CSV'}), ${today}`)

  const household = readHousehold()
  const series = {}
  let sp500Daily = null
  for (const id of HOUSEHOLD_SERIES) {
    const committed = household.series[id] ?? []
    if (id === 'SP500') {
      /* Keep the daily download for the bitcoin page before thinning it. */
      try {
        sp500Daily = await download(id)
        validate(id, sp500Daily)
      } catch (err) {
        warn(`SP500 (daily): ${err.message}`)
        sp500Daily = null
      }
      const obs = sp500Daily ? monthEnds(sp500Daily) : []
      series[id] = obs.length ? merge(committed, obs, (d) => d.slice(0, 7)) : committed
      console.log(`  ${id.padEnd(16)} ${String(series[id].length).padStart(5)} obs (month-end)`)
      continue
    }
    series[id] = (await fresh(id, committed)).merged
  }
  const recs = await recessions(household.recessions)
  writeHousehold(series, recs, today)

  const market = readMarket()
  const btc = await fresh('CBBTCUSD', market.btc)
  let spx = market.spx
  if (sp500Daily) {
    try {
      validate('SP500', sp500Daily, market.spx.at(-1)?.[0])
      spx = merge(market.spx, sp500Daily)
    } catch (err) {
      warn(`SP500 for bitcoin page: ${err.message}`)
    }
  }
  writeMarket(market, btc.merged, spx, today)
  console.log(`  bitcoin page: BTC through ${btc.merged.at(-1)[0]}, S&P through ${spx.at(-1)[0]}`)

  if (warnings.length) console.warn(`\n${warnings.length} warning(s); committed data kept for those series.`)
  else console.log('\nAll series refreshed.')
}

main().catch((err) => {
  console.error(`fetch-fred failed: ${err.stack ?? err}`)
  console.error('Continuing with the committed data.')
})
