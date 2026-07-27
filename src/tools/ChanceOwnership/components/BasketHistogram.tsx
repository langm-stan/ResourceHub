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

const SMALL_COLOR = 'var(--c-series-3)'
const LARGE_COLOR = 'var(--c-series-1)'

/**
 * Part three's evidence: the distribution of 10-year returns across many
 * random baskets of two sizes, drawn from the same real board, with the
 * market's own return as a reference line. The small-basket pile sprawls;
 * the large-basket pile stands tight around the market.
 */
export function BasketHistogram({
  small,
  large,
  smallSize,
  largeSize,
  market,
  caption,
  exportStats,
}: {
  /** Sorted sampled 10-year returns for each basket size. */
  small: number[]
  large: number[]
  smallSize: number
  largeSize: number
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
      ariaLabel={`Distribution of 10-year returns for random baskets of ${smallSize} and ${largeSize} tickets`}
    >
      <Inner small={small} large={large} smallSize={smallSize} largeSize={largeSize} market={market} />
    </ChartFrame>
  )
}

interface Bin {
  x0: number
  shareSmall: number
  shareLarge: number
}

function Inner({
  small,
  large,
  smallSize,
  largeSize,
  market,
}: {
  small: number[]
  large: number[]
  smallSize: number
  largeSize: number
  market: number
}) {
  const { innerWidth, innerHeight } = useChart()

  const { bins, binW, lo, hi } = useMemo(() => {
    /* Clip the domain to the small pile's middle 99% so one jackpot
     * basket cannot flatten everything; clipped draws join the edge bins. */
    const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]!
    const rawLo = Math.min(q(small, 0.005), q(large, 0.005), market)
    const rawHi = Math.max(q(small, 0.995), q(large, 0.995), market)
    const step = [5, 10, 20, 25, 50, 100].find((s) => (rawHi - rawLo) / s <= 30) ?? 200
    const lo = Math.floor(rawLo / step) * step
    const hi = Math.ceil(rawHi / step) * step
    const n = Math.round((hi - lo) / step)
    const bins: Bin[] = Array.from({ length: n }, (_, i) => ({ x0: lo + i * step, shareSmall: 0, shareLarge: 0 }))
    const drop = (arr: number[], key: 'shareSmall' | 'shareLarge') => {
      for (const v of arr) {
        const i = Math.min(n - 1, Math.max(0, Math.floor((v - lo) / step)))
        bins[i]![key] += 1 / arr.length
      }
    }
    drop(small, 'shareSmall')
    drop(large, 'shareLarge')
    return { bins, binW: step, lo, hi }
  }, [small, large, market])

  const x = useMemo(() => scaleLinear().domain([lo, hi]).range([0, innerWidth]), [lo, hi, innerWidth])
  const yMax = Math.max(...bins.map((b) => Math.max(b.shareSmall, b.shareLarge)))
  const y = useMemo(
    () => scaleLinear().domain([0, yMax * 1.12]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  const slot = x(lo + binW) - x(lo)

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={6} format={(v) => `${Math.round(v)}%`} />

      {bins.map((b) => (
        <g key={b.x0}>
          {b.shareSmall > 0 && (
            <rect
              x={x(b.x0) + slot * 0.08}
              y={y(b.shareSmall)}
              width={slot * 0.84}
              height={Math.max(0, innerHeight - y(b.shareSmall))}
              rx={2}
              fill={SMALL_COLOR}
              opacity={0.4}
            >
              <title>{`${b.x0}% to ${b.x0 + binW}%: ${formatPercent(b.shareSmall, 1)} of baskets of ${smallSize}`}</title>
            </rect>
          )}
          {b.shareLarge > 0 && (
            <rect
              x={x(b.x0) + slot * 0.26}
              y={y(b.shareLarge)}
              width={slot * 0.48}
              height={Math.max(0, innerHeight - y(b.shareLarge))}
              rx={2}
              fill={LARGE_COLOR}
              opacity={0.85}
            >
              <title>{`${b.x0}% to ${b.x0 + binW}%: ${formatPercent(b.shareLarge, 1)} of baskets of ${largeSize}`}</title>
            </rect>
          )}
        </g>
      ))}

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
      <text
        x={x(market) + 6}
        y={12}
        fontSize={11}
        fontWeight={600}
        fill="var(--c-accent)"
      >
        the market
      </text>
    </>
  )
}
