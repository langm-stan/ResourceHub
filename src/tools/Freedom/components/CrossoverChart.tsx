import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  Annotation,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  VMarker,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatUSDCompact, formatUSDWhole } from '../../../lib/format'
import type { WealthPoint } from '../compute'

/**
 * The crossover day: the "investment paycheck" (4% of wealth) rises year by
 * year until it passes the spending line. After that point, work is optional.
 */
export function CrossoverChart({
  path,
  spendYr,
  freedomAge,
  caption,
  exportStats,
}: {
  path: WealthPoint[]
  spendYr: number
  freedomAge: number | null
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={430}
      figure="Figure 2."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Investment income rising past annual spending over time"
    >
      <Inner path={path} spendYr={spendYr} freedomAge={freedomAge} />
    </ChartFrame>
  )
}

function Inner({
  path,
  spendYr,
  freedomAge,
}: {
  path: WealthPoint[]
  spendYr: number
  freedomAge: number | null
}) {
  const { innerWidth, innerHeight } = useChart()
  const ages = path.map((p) => p.age)
  const yMax = Math.max(spendYr * 1.6, ...path.map((p) => p.investmentIncome)) * 1.1
  const x = useMemo(
    () => scaleLinear().domain([ages[0]!, ages[ages.length - 1]!]).range([0, innerWidth]),
    [ages, innerWidth]
  )
  const y = useMemo(
    () => scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={formatUSDCompact} />
      <AxisBottom x={x} ticks={7} format={(v) => `age ${Math.round(v)}`} />

      <LineSeries
        data={path}
        x={(d: WealthPoint) => d.age}
        y={() => spendYr}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2}
        dashed
      />
      <LineSeries
        data={path}
        x={(d: WealthPoint) => d.age}
        y={(d: WealthPoint) => d.investmentIncome}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.6}
        draw
      />

      <Annotation
        x={x(ages[Math.min(3, ages.length - 1)]!)}
        y={y(spendYr)}
        dx={12}
        dy={-30}
        label={`your spending: ${formatUSDWhole(spendYr)}/yr`}
        align="start"
        tone="accent"
      />

      {freedomAge !== null && freedomAge <= ages[ages.length - 1]! && (
        <VMarker x={freedomAge} xScale={x} label={`work becomes optional · age ${Math.round(freedomAge)}`} />
      )}

      <HoverProbe
        data={path}
        x={(d: WealthPoint) => d.age}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Age ${Math.round(v)}`}
        series={[
          {
            label: 'Investment paycheck (4% of wealth)',
            color: 'var(--c-series-1)',
            y: (d: WealthPoint) => d.investmentIncome,
            format: formatUSDWhole,
          },
          {
            label: 'Wealth',
            y: (d: WealthPoint) => d.wealth,
            dot: false,
            format: formatUSDWhole,
          },
        ]}
      />
    </>
  )
}
