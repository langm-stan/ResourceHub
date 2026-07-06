import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatPercent } from '../../../lib/format'
import { MARKET_SD, SINGLE_STOCK_SD, type PortfolioPoint } from '../compute'

/**
 * Figure 2: portfolio risk as stocks are added. The green line is the
 * calibrated real-world curve converging to the market's 20% floor;
 * the grey dashed line is the same portfolio if stocks moved
 * independently. A marker tracks the reader's chosen n.
 */
export function PortfolioRiskChart({
  points,
  n,
  caption,
  exportStats,
}: {
  points: PortfolioPoint[]
  n: number
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      figure="Figure 2."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Portfolio risk falling toward the market floor as stocks are added"
    >
      <Inner points={points} n={n} />
    </ChartFrame>
  )
}

function Inner({ points, n }: { points: PortfolioPoint[]; n: number }) {
  const { innerWidth, innerHeight } = useChart()
  const maxN = points[points.length - 1]!.n

  const x = useMemo(
    () => scaleLinear().domain([1, maxN]).range([0, innerWidth]),
    [maxN, innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, SINGLE_STOCK_SD * 1.1]).range([innerHeight, 0]),
    [innerHeight]
  )

  const current = points.find((p) => p.n === n) ?? points[0]!

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={6} format={(v) => `${Math.round(v)}`} />

      {/* The systematic-risk floor: the market's own 20% swing. */}
      <line
        x1={0}
        x2={innerWidth}
        y1={y(MARKET_SD)}
        y2={y(MARKET_SD)}
        stroke="var(--c-accent)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <text
        x={innerWidth - 6}
        y={y(MARKET_SD) - 8}
        textAnchor="end"
        fontSize={11}
        fontWeight={600}
        fill="var(--c-accent)"
      >
        market risk · {formatPercent(MARKET_SD, 0)} stays no matter what
      </text>

      <LineSeries
        data={points}
        x={(d: PortfolioPoint) => d.n}
        y={(d: PortfolioPoint) => d.independent}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-3)"
        width={2}
        dashed
      />
      <LineSeries
        data={points}
        x={(d: PortfolioPoint) => d.n}
        y={(d: PortfolioPoint) => d.real}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      {/* The reader's portfolio. */}
      <line
        x1={x(current.n)}
        x2={x(current.n)}
        y1={0}
        y2={innerHeight}
        stroke="var(--c-cardinal)"
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.5}
      />
      <circle
        cx={x(current.n)}
        cy={y(current.real)}
        r={5}
        fill="var(--surface)"
        stroke="var(--c-series-1)"
        strokeWidth={2.5}
      />
      <text
        x={x(current.n) + 9}
        y={y(current.real) - 9}
        fontSize={11}
        fontWeight={600}
        fill="var(--c-series-1)"
      >
        {current.n} {current.n === 1 ? 'stock' : 'stocks'} · {formatPercent(current.real, 0)}
      </text>

      <HoverProbe
        data={points}
        x={(d: PortfolioPoint) => d.n}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${Math.round(v)} ${Math.round(v) === 1 ? 'stock' : 'stocks'}`}
        series={[
          {
            label: 'Real stocks, moving together',
            color: 'var(--c-series-1)',
            y: (d: PortfolioPoint) => d.real,
            format: (v) => formatPercent(v, 1),
          },
          {
            label: 'If stocks were independent',
            color: 'var(--c-series-3)',
            y: (d: PortfolioPoint) => d.independent,
            format: (v) => formatPercent(v, 1),
          },
        ]}
      />
    </>
  )
}
