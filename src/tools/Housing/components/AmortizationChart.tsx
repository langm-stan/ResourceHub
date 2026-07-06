import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  Annotation,
  AreaSeries,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatUSDCompact, formatUSDWhole } from '../../../lib/format'
import type { YearRow } from '../compute'

/**
 * The lesson's central figure: how each year's payments split between
 * interest (the bank's share) and principal (the buyer's equity). Early
 * years are mostly interest; the stack flips partway through the loan.
 */
export function AmortizationChart({
  years,
  termYears,
  crossoverYear,
  caption,
  exportStats,
}: {
  years: YearRow[]
  termYears: number
  crossoverYear: number | null
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.44}
      maxHeight={420}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Interest and principal paid each year over a ${termYears}-year mortgage`}
    >
      <Inner years={years} termYears={termYears} crossoverYear={crossoverYear} />
    </ChartFrame>
  )
}

function Inner({
  years,
  termYears,
  crossoverYear,
}: {
  years: YearRow[]
  termYears: number
  crossoverYear: number | null
}) {
  const { innerWidth, innerHeight } = useChart()
  const yMax = Math.max(...years.map((d) => d.interest + d.principal)) * 1.15

  const x = useMemo(
    () => scaleLinear().domain([1, termYears]).range([0, innerWidth]),
    [termYears, innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  const cross = crossoverYear ? years.find((d) => d.year === crossoverYear) : null

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={formatUSDCompact} />
      <AxisBottom x={x} ticks={Math.min(6, termYears)} format={(v) => `yr ${Math.round(v)}`} />

      <AreaSeries
        data={years}
        x={(d: YearRow) => d.year}
        y0={() => 0}
        y1={(d: YearRow) => d.interest}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-accent) 26%, var(--surface-raised))"
        stroke="var(--c-accent)"
      />
      <AreaSeries
        data={years}
        x={(d: YearRow) => d.year}
        y0={(d: YearRow) => d.interest}
        y1={(d: YearRow) => d.interest + d.principal}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-series-1) 30%, var(--surface-raised))"
        stroke="var(--c-series-1)"
      />

      {cross && (
        <Annotation
          x={x(cross.year)}
          y={y(cross.interest)}
          dy={-36}
          label={`year ${cross.year}: principal finally outpaces interest`}
          align={x(cross.year) > innerWidth * 0.7 ? 'end' : 'middle'}
          tone="ink"
        />
      )}

      <HoverProbe
        data={years}
        x={(d: YearRow) => d.year}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Year ${Math.round(v)}`}
        series={[
          {
            label: 'Interest paid',
            color: 'var(--c-accent)',
            y: (d: YearRow) => d.interest,
            format: formatUSDWhole,
          },
          {
            label: 'Principal paid',
            color: 'var(--c-series-1)',
            y: (d: YearRow) => d.principal,
            dotY: (d: YearRow) => d.interest + d.principal,
            format: formatUSDWhole,
          },
          {
            label: 'Still owed',
            y: (d: YearRow) => d.balance,
            dot: false,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
