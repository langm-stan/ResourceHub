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
import { formatPercent, formatUSD } from '../../../lib/format'
import type { CoinOutcome } from '../compute'

/**
 * Figure 1: the distribution of the coin game's net outcome. One bar
 * per possible result; losses in cardinal, gains in green, even in
 * slate. As n grows the extremes collapse toward the middle.
 */
export function CoinGameChart({
  outcomes,
  n,
  caption,
  exportStats,
}: {
  outcomes: CoinOutcome[]
  n: number
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={360}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Distribution of outcomes when a one dollar bet is split across ${n} coin flips`}
    >
      <Inner outcomes={outcomes} n={n} />
    </ChartFrame>
  )
}

function Inner({ outcomes, n }: { outcomes: CoinOutcome[]; n: number }) {
  const { innerWidth, innerHeight } = useChart()
  const maxP = Math.max(...outcomes.map((o) => o.probability))

  const x = useMemo(
    () => scaleLinear().domain([-1.12, 1.12]).range([0, innerWidth]),
    [innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, maxP * 1.12]).range([innerHeight, 0]).nice(),
    [maxP, innerHeight]
  )

  // Bars sit at each possible net outcome; spacing shrinks as n grows.
  const step = n > 0 ? x(2 / n) - x(0) : innerWidth
  const barW = Math.min(Math.max(step * 0.72, 2), 56)

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={5} format={(v) => formatUSD(v)} />

      {outcomes.map((o) => {
        const fill =
          o.net < -1e-9
            ? 'color-mix(in srgb, var(--c-accent) 62%, var(--surface))'
            : o.net > 1e-9
              ? 'color-mix(in srgb, var(--c-series-1) 62%, var(--surface))'
              : 'color-mix(in srgb, var(--c-series-3) 62%, var(--surface))'
        return (
          <rect
            key={o.k}
            x={x(o.net) - barW / 2}
            y={y(o.probability)}
            width={barW}
            height={Math.max(0, innerHeight - y(o.probability))}
            rx={2}
            fill={fill}
          >
            <title>
              {`Net ${formatUSD(o.net)}: ${formatPercent(o.probability, o.probability < 0.01 ? 2 : 1)}`}
            </title>
          </rect>
        )
      })}
    </>
  )
}
