import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { ChartFrame, useChart, type ExportStat } from '../../../design-system/chart'
import { ODDS } from '../compute'

/**
 * Figure 3: expected dollars returned per $1 staked, game by game,
 * with the index fund's average year for contrast. Horizontal bars
 * against a break-even line at $1.
 */
export function OddsChart({
  caption,
  exportStats,
}: {
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      height={ODDS.length * 42 + 56}
      margin={{ top: 26, right: 70, bottom: 16, left: 210 }}
      figure="Figure 3."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Expected amount returned per dollar staked across games and an index fund"
    >
      <Inner />
    </ChartFrame>
  )
}

function fmtPayback(v: number): string {
  if (v >= 1) return `$${v.toFixed(2)}`
  const cents = v * 100
  return `${Number.isInteger(cents) ? cents : cents.toFixed(1)}¢`
}

function Inner() {
  const { innerWidth, innerHeight } = useChart()
  const x = useMemo(() => scaleLinear().domain([0, 1.14]).range([0, innerWidth]), [innerWidth])
  const rowH = innerHeight / ODDS.length

  return (
    <>
      {ODDS.map((row, i) => {
        const yTop = i * rowH + rowH * 0.2
        const barH = rowH * 0.6
        const fill =
          row.kind === 'invest'
            ? 'color-mix(in srgb, var(--c-series-1) 70%, var(--surface))'
            : 'color-mix(in srgb, var(--c-accent) 58%, var(--surface))'
        const valueColor = row.kind === 'invest' ? 'var(--c-series-1)' : 'var(--c-accent)'
        return (
          <g key={row.label}>
            <text
              x={-12}
              y={yTop + barH / 2}
              dy="0.32em"
              textAnchor="end"
              fontSize={12.5}
              fill="var(--text-primary)"
            >
              {row.label}
            </text>
            <rect x={0} y={yTop} width={x(row.payback)} height={barH} rx={3} fill={fill} />
            <text
              x={x(row.payback) + 8}
              y={yTop + barH / 2}
              dy="0.32em"
              fontSize={12.5}
              fontWeight={600}
              fill={valueColor}
              className="tnum"
            >
              {fmtPayback(row.payback)}
            </text>
          </g>
        )
      })}

      {/* Break even: get back exactly what you put in. */}
      <line
        x1={x(1)}
        x2={x(1)}
        y1={-8}
        y2={innerHeight}
        stroke="var(--c-ink-faint)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x={x(1)}
        y={-14}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--text-muted)"
      >
        $1 · break even
      </text>
    </>
  )
}
