import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  Annotation,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  EndLabel,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatPercent } from '../../../lib/format'
import { yearsToFreedom } from '../compute'

interface CurvePoint {
  rate: number
  years: number
}

/**
 * The lesson's central figure: years until work is optional, as a function of
 * the savings rate alone. Income never enters the curve; that is the point.
 */
export function RateCurveChart({
  ownRate,
  ownYears,
  caption,
  exportStats,
}: {
  ownRate: number
  ownYears: number
  caption: string
  exportStats?: ExportStat[]
}) {
  const points = useMemo(() => {
    const pts: CurvePoint[] = []
    for (let s = 0.02; s <= 0.7001; s += 0.005) {
      pts.push({ rate: s, years: yearsToFreedom(s) })
    }
    return pts
  }, [])

  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={430}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="Years until work is optional across savings rates"
    >
      <Inner points={points} ownRate={ownRate} ownYears={ownYears} />
    </ChartFrame>
  )
}

function Inner({
  points,
  ownRate,
  ownYears,
}: {
  points: CurvePoint[]
  ownRate: number
  ownYears: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const x = useMemo(() => scaleLinear().domain([0, 0.7]).range([0, innerWidth]), [innerWidth])
  const y = useMemo(() => scaleLinear().domain([0, 60]).range([innerHeight, 0]), [innerHeight])

  const showOwn = ownRate > 0.02 && ownRate <= 0.7 && Number.isFinite(ownYears) && ownYears <= 60

  return (
    <>
      <Gridlines y={y} ticks={6} />
      <AxisLeft y={y} ticks={6} format={(v) => `${v} yrs`} />
      <AxisBottom x={x} ticks={7} format={(v) => formatPercent(v, 0)} />

      <LineSeries
        data={points.filter((p) => p.years <= 60)}
        x={(d: CurvePoint) => d.rate}
        y={(d: CurvePoint) => d.years}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.6}
        draw
      />

      <Annotation
        x={x(0.1)}
        y={y(yearsToFreedom(0.1))}
        dx={10}
        dy={-34}
        label="save 10%: a full career"
        align="start"
        tone="ink"
      />
      <Annotation
        x={x(0.5)}
        y={y(yearsToFreedom(0.5))}
        dx={0}
        dy={-38}
        label="save 50%: free in about 15 years"
        align="middle"
        tone="ink"
      />

      {showOwn && (
        <EndLabel
          x={x(ownRate)}
          y={y(ownYears)}
          text={`you: ${Math.round(ownYears)} years`}
          color="var(--c-accent)"
        />
      )}

      <HoverProbe
        data={points}
        x={(d: CurvePoint) => d.rate}
        xScale={x}
        yScale={y}
        xLabel={(v) => `Saving ${formatPercent(v, 0)} of income`}
        series={[
          {
            label: 'Years until work is optional',
            color: 'var(--c-series-1)',
            y: (d: CurvePoint) => Math.min(60, d.years),
            format: (v) => (v >= 60 ? 'more than 60' : `${v.toFixed(1)} years`),
          },
        ]}
      />
    </>
  )
}
