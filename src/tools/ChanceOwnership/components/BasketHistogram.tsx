import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatPercent } from '../../../lib/format'

const A_COLOR = 'var(--c-series-3)'
const B_COLOR = 'var(--c-series-1)'
const SOLO_COLOR = 'var(--c-series-1)'

export interface HistogramPile {
  size: number
  /** The full sample in draw order; fixes the bins and final bar heights. */
  all: number[]
  /** How many of `all` have been dealt so far. */
  shown: number
}

/**
 * Part three's evidence, dealt live: the distribution of 10-year returns
 * across random baskets of one or two chosen sizes, drawn from the same
 * real board, with the market's own return as a reference line. Bars grow
 * toward their final heights as baskets are dealt; axes and bins are fixed
 * up front from the full sample so nothing jumps mid-deal.
 */
export function BasketHistogram({
  a,
  b,
  market,
  caption,
  exportStats,
}: {
  a: HistogramPile
  b?: HistogramPile
  /** The index's 10-year return on the same board. */
  market: number
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Distribution of 10-year returns for random baskets of ${a.size}${b ? ` and ${b.size}` : ''} tickets`}
    >
      <Inner a={a} b={b} market={market} />
    </ChartFrame>
  )
}

const quantile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!

function Inner({ a, b, market }: { a: HistogramPile; b?: HistogramPile; market: number }) {
  const { innerWidth, innerHeight } = useChart()

  const { lo, hi, step, yMax } = useMemo(() => {
    /* Clip the domain to each pile's middle 99% so one jackpot basket
     * cannot flatten everything; clipped draws join the edge bins. */
    const sortedA = [...a.all].sort((x, y) => x - y)
    const sortedB = b ? [...b.all].sort((x, y) => x - y) : null
    let rawLo = Math.min(quantile(sortedA, 0.005), market)
    let rawHi = Math.max(quantile(sortedA, 0.995), market)
    if (sortedB) {
      rawLo = Math.min(rawLo, quantile(sortedB, 0.005))
      rawHi = Math.max(rawHi, quantile(sortedB, 0.995))
    }
    const step = [5, 10, 20, 25, 50, 100].find((s) => (rawHi - rawLo) / s <= 30) ?? 200
    const lo = Math.floor(rawLo / step) * step
    const hi = Math.ceil(rawHi / step) * step
    /* Final bar heights, for a y-axis that holds still through the deal. */
    const finalShare = (all: number[]) => {
      const n = Math.round((hi - lo) / step)
      const counts = new Array<number>(n).fill(0)
      for (const v of all) counts[Math.min(n - 1, Math.max(0, Math.floor((v - lo) / step)))]! += 1
      return Math.max(...counts) / all.length
    }
    const yMax = Math.max(finalShare(a.all), b ? finalShare(b.all) : 0)
    return { lo, hi, step, yMax }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.all, b?.all, market])

  const nBins = Math.round((hi - lo) / step)
  const binShares = (pile: HistogramPile) => {
    const counts = new Array<number>(nBins).fill(0)
    for (let i = 0; i < pile.shown; i++) {
      const v = pile.all[i]!
      counts[Math.min(nBins - 1, Math.max(0, Math.floor((v - lo) / step)))]! += 1
    }
    return counts.map((c) => c / pile.all.length)
  }
  const sharesA = binShares(a)
  const sharesB = b ? binShares(b) : null

  const x = useMemo(() => scaleLinear().domain([lo, hi]).range([0, innerWidth]), [lo, hi, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, yMax * 1.12]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )
  const slot = x(lo + step) - x(lo)

  const bar = (i: number, share: number, inset: number, width: number, color: string, opacity: number, label: string) =>
    share > 0 && (
      <rect
        key={`${label}-${i}`}
        x={x(lo + i * step) + slot * inset}
        y={y(share)}
        width={slot * width}
        height={Math.max(0, innerHeight - y(share))}
        rx={2}
        fill={color}
        opacity={opacity}
      >
        <title>{`${lo + i * step}% to ${lo + (i + 1) * step}%: ${formatPercent(share, 1)} of ${label}`}</title>
      </rect>
    )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={6} format={(v) => `${Math.round(v)}%`} />

      {sharesA.map((s, i) =>
        sharesB
          ? bar(i, s, 0.08, 0.84, A_COLOR, 0.4, `baskets of ${a.size}`)
          : bar(i, s, 0.08, 0.84, SOLO_COLOR, 0.8, `baskets of ${a.size}`)
      )}
      {sharesB && sharesB.map((s, i) => bar(i, s, 0.26, 0.48, B_COLOR, 0.85, `baskets of ${b!.size}`))}

      {/* The market's own decade on this board. */}
      <line
        x1={x(market)}
        x2={x(market)}
        y1={0}
        y2={innerHeight}
        stroke="var(--c-accent)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        opacity={0.85}
      />
      <text x={x(market) + 6} y={12} fontSize={11} fontWeight={600} fill="var(--c-accent)">
        the market
      </text>
    </>
  )
}
