#!/usr/bin/env node
/*
 * Refresh Bitcoin Mining's price history from FRED (CBBTCUSD and SP500).
 *
 *   node scripts/fetch-fred.mjs
 *
 * Runs before every deploy, including the nightly one (see
 * .github/workflows/deploy.yml), and can be run by hand to commit a fresh
 * snapshot. Rewrites src/tools/BitcoinMining/marketData.ts.
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

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MARKET_FILE = join(ROOT, 'src/tools/BitcoinMining/marketData.ts')

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

/** Fresh values override committed ones on the same date; nothing is dropped. */
function merge(committed, fresh) {
  const byKey = new Map()
  for (const o of committed) byKey.set(o[0], o)
  for (const o of fresh) byKey.set(o[0], o)
  return [...byKey.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
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

async function fresh(id, committed) {
  try {
    const obs = await download(id)
    validate(id, obs, committed.at(-1)?.[0])
    const merged = merge(committed, obs)
    console.log(`  ${id.padEnd(9)} ${String(merged.length).padStart(5)} obs, through ${merged.at(-1)[0]}`)
    return merged
  } catch (err) {
    warn(`${id}: ${err.message}; keeping the committed ${committed.length} observations`)
    return committed
  }
}

async function main() {
  console.log(`Refreshing FRED series (${process.env.FRED_API_KEY ? 'API' : 'public CSV'}), ${today}`)
  const market = readMarket()
  const btc = await fresh('CBBTCUSD', market.btc)
  const spx = await fresh('SP500', market.spx)
  writeMarket(market, btc, spx, today)

  if (warnings.length) console.warn(`\n${warnings.length} warning(s); committed data kept for those series.`)
  else console.log('\nAll series refreshed.')
}

main().catch((err) => {
  console.error(`fetch-fred failed: ${err.stack ?? err}`)
  console.error('Continuing with the committed data.')
})
