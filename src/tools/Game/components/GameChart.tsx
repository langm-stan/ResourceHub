import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  LineSeries,
  useChart,
} from '../../../design-system/chart'

export interface GamePoint {
  month: number
  /** Index level, normalized to 100 at the round's start. */
  level: number
  /** Whether the player was in cash during this month. */
  inCash: boolean
}

/**
 * The live game chart: the mystery market line drawn up to the current
 * month, with the player's in-cash stretches shaded. No dates anywhere
 * until the reveal.
 */
export function GameChart({
  points,
  totalMonths,
  maxLevel,
  minLevel,
  caption,
}: {
  points: GamePoint[]
  totalMonths: number
  maxLevel: number
  minLevel: number
  caption: string
}) {
  return (
    <ChartFrame
      ratio={0.42}
      maxHeight={380}
      caption={caption}
      ariaLabel="Mystery market history unfolding month by month"
    >
      <Inner points={points} totalMonths={totalMonths} maxLevel={maxLevel} minLevel={minLevel} />
    </ChartFrame>
  )
}

function Inner({
  points,
  totalMonths,
  maxLevel,
  minLevel,
}: {
  points: GamePoint[]
  totalMonths: number
  maxLevel: number
  minLevel: number
}) {
  const { innerWidth, innerHeight } = useChart()

  const x = useMemo(
    () => scaleLinear().domain([0, totalMonths]).range([0, innerWidth]),
    [totalMonths, innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([minLevel * 0.94, maxLevel * 1.06]).range([innerHeight, 0]).nice(),
    [minLevel, maxLevel, innerHeight]
  )

  // Contiguous in-cash stretches become shaded bands.
  const bands: { from: number; to: number }[] = []
  for (const p of points) {
    if (!p.inCash) continue
    const last = bands[bands.length - 1]
    if (last && last.to === p.month - 1) last.to = p.month
    else bands.push({ from: p.month - 1, to: p.month })
  }

  return (
    <>
      <Gridlines y={y} ticks={4} />
      <AxisLeft y={y} ticks={4} format={(v) => `${Math.round(v)}`} />
      <AxisBottom
        x={x}
        ticks={5}
        format={(v) => (v === 0 ? 'start' : `${Math.round(v / 12)} yr`)}
      />

      {bands.map((b) => (
        <rect
          key={b.from}
          x={x(b.from)}
          y={0}
          width={x(b.to) - x(b.from)}
          height={innerHeight}
          fill="color-mix(in srgb, var(--c-series-3) 14%, transparent)"
        />
      ))}

      <line
        x1={0}
        x2={innerWidth}
        y1={y(100)}
        y2={y(100)}
        stroke="var(--c-ink-faint)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      <LineSeries
        data={points}
        x={(d: GamePoint) => d.month}
        y={(d: GamePoint) => d.level}
        xScale={x}
        yScale={y}
        stroke="var(--c-ink)"
        width={2.2}
      />

      {points.length > 0 && (
        <circle
          cx={x(points[points.length - 1]!.month)}
          cy={y(points[points.length - 1]!.level)}
          r={4.5}
          fill={points[points.length - 1]!.inCash ? 'var(--c-series-3)' : 'var(--c-series-1)'}
        />
      )}
    </>
  )
}
