import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AreaSeries,
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { underwaterPath, btcSeries } from '../riskCompute'

/*
 * How far below its previous best the price sat on each day.
 *
 * A price line rising over ten years says bitcoin went up. This says what
 * holding it was like, which is the question a person buying it is actually
 * asking: zero means a new high, and everything below zero is the wait.
 */
export function UnderwaterChart({
  caption,
  exportStats,
}: {
  caption: string
  exportStats?: ExportStat[]
}) {
  return (
    <ChartFrame
      ratio={0.4}
      maxHeight={340}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel="How far bitcoin's price sat below its previous all-time high, each day since 2014"
    >
      <Inner />
    </ChartFrame>
  )
}

function Inner() {
  const { innerWidth, innerHeight } = useChart()
  const path = useMemo(() => underwaterPath(btcSeries), [])

  /* The chart kit's scales are numeric, so the axis runs on the day offset
     the series already carries and the ticks are turned back into years. */
  const last = path[path.length - 1]!
  const x = useMemo(
    () => scaleLinear().domain([0, last.t]).range([0, innerWidth]),
    [last.t, innerWidth],
  )
  const yearAt = (t: number) => {
    const d = new Date(path[0]!.date.getTime() + t * 86_400_000)
    return String(d.getUTCFullYear())
  }
  const y = useMemo(
    () => scaleLinear().domain([-1, 0]).range([innerHeight, 0]),
    [innerHeight],
  )

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => `${Math.round(v * 100)}%`} />
      <AxisBottom x={x} ticks={6} format={(v) => yearAt(v)} />
      <AreaSeries
        data={path}
        x={(d) => d.t}
        y0={() => 0}
        y1={(d) => d.depth}
        xScale={x}
        yScale={y}
        fill="color-mix(in srgb, var(--c-accent) 22%, var(--surface))"
        stroke="var(--c-accent)"
      />
    </>
  )
}
