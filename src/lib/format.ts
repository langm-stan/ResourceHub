export const fmtUSD = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export const fmtPct = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`

/*
 * Below: the Toolkit's own formatting helpers, ported verbatim (src/lib/format.ts).
 * Used by the ported tool pages under src/tools/. No component there should call
 * `.toFixed()` or concatenate `'%'` directly — route everything through here.
 */

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const USD_WHOLE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const USD_COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Currency with cents — use when cents carry meaning (e.g. "$2,132.12"). */
export function formatUSD(value: number): string {
  return USD.format(value)
}

/** Currency rounded to whole dollars — the default for large headline figures. */
export function formatUSDWhole(value: number): string {
  if (Math.abs(value) < 100 && !Number.isInteger(value)) return USD.format(value)
  return USD_WHOLE.format(value)
}

/** Compact currency for axis ticks: $1.2M, $940K. */
export function formatUSDCompact(value: number): string {
  if (Math.abs(value) < 1000) return USD_WHOLE.format(value)
  return USD_COMPACT.format(value)
}

/** Percentage from a decimal rate. `0.083` → "8.3%". */
export function formatPercent(rate: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(rate)
}

/** A duration in years, read naturally: "9.0 years", "1 year", "6 months". */
export function formatYears(years: number): string {
  if (years < 1) {
    const months = Math.round(years * 12)
    return `${months} month${months === 1 ? '' : 's'}`
  }
  const rounded = Math.round(years * 10) / 10
  return `${rounded} year${rounded === 1 ? '' : 's'}`
}

/** Plain grouped integer, e.g. "8,760". */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

/*
 * Numbers destined for KaTeX. A raw "$" is a reserved character in TeX (it
 * renders as an error), and a bare comma in math mode gets punctuation
 * spacing — so dollars are escaped and group separators wrapped in braces:
 * texUSD(80641) → "\$80{,}641".
 */
export function texNumber(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}')
  return frac ? `${grouped}.${frac}` : grouped
}

export function texUSD(value: number): string {
  return `\\$${texNumber(value)}`
}
