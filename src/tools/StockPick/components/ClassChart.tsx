import { useMemo } from 'react'
import { scaleLog } from 'd3-scale'
import type { ScaleLinear } from 'd3-scale'
import { ChartFrame, useChart, type ExportStat } from '../../../design-system/chart'
import { formatUSDWhole } from '../../../lib/format'
import { STAKE, type Cohort } from '../data'

/**
 * The reveal: every stock in the class as a horizontal bar of what the
 * $1,000 became, on a log scale, with the index fund drawn in green and
 * the player's pick flagged. Wiped-out positions clamp to a sliver.
 */
export function ClassChart({
  cohort,
  picked,
  caption,
  exportStats,
}: {
  cohort: Cohort
  /** Ticker of the player's pick, or 'FUND'. */
  picked: string
  caption: string
  exportStats?: ExportStat[]
}) {
  const rows = useMemo(() => {
    const list = [
      ...cohort.stocks.map((s) => ({
        key: s.ticker,
        label: `${s.name}`,
        value: s.multiple * STAKE,
        isFund: false,
      })),
      { key: 'FUND', label: 'S&P 500 index fund', value: cohort.indexMultiple * STAKE, isFund: true },
    ]
    return list.sort((a, b) => b.value - a.value)
  }, [cohort])

  return (
    <ChartFrame
      height={rows.length * 34 + 46}
      margin={{ top: 24, right: 96, bottom: 16, left: 170 }}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`What one thousand dollars in each famous stock of ${cohort.year} became by 2026`}
    >
      <Inner rows={rows} picked={picked} />
    </ChartFrame>
  )
}

const CLAMP = 20 // wiped-out positions draw as a sliver at $20

function Inner({
  rows,
  picked,
}: {
  rows: { key: string; label: string; value: number; isFund: boolean }[]
  picked: string
}) {
  const { innerWidth, innerHeight } = useChart()
  const hi = Math.max(...rows.map((r) => r.value)) * 1.4
  const x = useMemo(
    () => scaleLog().domain([CLAMP, hi]).range([0, innerWidth]) as unknown as ScaleLinear<number, number>,
    [hi, innerWidth]
  )
  const rowH = innerHeight / rows.length

  return (
    <>
      {rows.map((row, i) => {
        const yTop = i * rowH + rowH * 0.16
        const barH = rowH * 0.62
        const v = Math.max(row.value, CLAMP)
        const mine = row.key === picked
        const fill = row.isFund
          ? 'color-mix(in srgb, var(--c-series-1) 72%, var(--surface))'
          : row.value >= STAKE
            ? 'color-mix(in srgb, var(--c-series-3) 60%, var(--surface))'
            : 'color-mix(in srgb, var(--c-accent) 55%, var(--surface))'
        return (
          <g key={row.key}>
            <text
              x={-12}
              y={yTop + barH / 2}
              dy="0.32em"
              textAnchor="end"
              fontSize={12.5}
              fontWeight={mine ? 700 : 400}
              fill="var(--text-primary)"
            >
              {row.label}
            </text>
            <rect
              x={0}
              y={yTop}
              width={Math.max(2, x(v))}
              height={barH}
              rx={3}
              fill={fill}
              stroke={mine ? 'var(--c-ink)' : 'none'}
              strokeWidth={mine ? 1.8 : 0}
            />
            <text
              x={Math.max(2, x(v)) + 8}
              y={yTop + barH / 2}
              dy="0.32em"
              fontSize={12.5}
              fontWeight={600}
              fill={row.isFund ? 'var(--c-series-1)' : row.value >= STAKE ? 'var(--text-muted)' : 'var(--c-accent)'}
              className="tnum"
            >
              {row.value < CLAMP ? 'wiped out' : formatUSDWhole(row.value)}
              {mine ? '  ← you' : ''}
            </text>
          </g>
        )
      })}

      {/* The starting stake, for reference. */}
      <line
        x1={x(STAKE)}
        x2={x(STAKE)}
        y1={-6}
        y2={innerHeight}
        stroke="var(--c-ink-faint)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={x(STAKE)} y={-12} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-muted)">
        the $1,000 you put in
      </text>
    </>
  )
}
