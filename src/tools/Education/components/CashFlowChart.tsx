import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { AxisBottom, AxisLeft, ChartFrame, Gridlines, useChart } from '../../../design-system/chart'
import { formatUSDCompact } from '../../../lib/format'
import type { CashFlow } from '../compute'

/*
 * The decision drawn as the money moves: a bar below the line for each year
 * of tuition and forgone income, a bar above it for each year the raise is
 * earned. The bars are the raw amounts, so the picture shows why a short
 * row of deep costs can still be outweighed by a long row of shallow gains.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'

export function CashFlowChart({
  flows,
  caption,
  ariaLabel,
}: {
  flows: CashFlow[]
  caption: string
  ariaLabel: string
}) {
  return (
    <ChartFrame ratio={0.4} maxHeight={340} caption={caption} ariaLabel={ariaLabel}>
      <Bars flows={flows} />
    </ChartFrame>
  )
}

function Bars({ flows }: { flows: CashFlow[] }) {
  const { innerWidth, innerHeight } = useChart()

  const lastYear = flows.length ? flows[flows.length - 1]!.t : 1
  const amounts = flows.map((f) => f.amount)
  const top = Math.max(0, ...amounts)
  const bottom = Math.min(0, ...amounts)
  // A little headroom so the tallest bar does not touch the frame.
  const pad = (top - bottom) * 0.08 || 1

  const xs = useMemo(
    () => scaleLinear().domain([-0.5, lastYear + 0.5]).range([0, innerWidth]),
    [lastYear, innerWidth]
  )
  const ys = useMemo(
    () => scaleLinear().domain([bottom - pad, top + pad]).range([innerHeight, 0]),
    [bottom, top, pad, innerHeight]
  )

  // One bar per year, never thinner than a hairline and never wider than a
  // comfortable column, so a 40-year stream stays readable.
  const step = innerWidth / (lastYear + 1)
  const barWidth = Math.max(1.5, Math.min(step * 0.7, 22))
  const zero = ys(0)

  return (
    <>
      <Gridlines y={ys} ticks={5} />
      {flows.map((f) => {
        const yTop = f.amount >= 0 ? ys(f.amount) : zero
        const height = Math.max(1, Math.abs(ys(f.amount) - zero))
        return (
          <rect
            key={f.t}
            x={xs(f.t) - barWidth / 2}
            y={yTop}
            width={barWidth}
            height={height}
            fill={f.amount >= 0 ? GREEN : RED}
            opacity={0.9}
          />
        )
      })}
      <line x1={0} x2={innerWidth} y1={zero} y2={zero} stroke="var(--chart-axis)" strokeWidth={1} />
      <AxisLeft y={ys} ticks={5} format={formatUSDCompact} />
      <AxisBottom
        x={xs}
        ticks={Math.min(8, lastYear + 1)}
        format={(v: number) => (Number.isInteger(v) && v >= 0 ? `yr ${v}` : '')}
      />
    </>
  )
}
