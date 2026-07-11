import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  useChart,
  type ExportStat,
  type HoverSeries,
} from '../../../design-system/chart'
import { formatUSDCompact, formatUSDWhole } from '../../../lib/format'

export interface ChartLine {
  ys: number[]
  color: string
  width?: number
  dashed?: boolean
  opacity?: number
  /** Name shown in the hover readout. Unlabeled lines (e.g. sample paths) stay out of it. */
  label?: string
}

/** A hover-readout row that is not drawn as a line (e.g. cumulative contributions). */
export interface HoverExtra {
  label: string
  ys: number[]
  color?: string
}

interface StationChartProps {
  x: number[]
  lines: ChartLine[]
  yMax: number
  /** Y-axis floor; defaults to 0 (e.g. an age axis wants a higher floor). */
  yMin?: number
  /** Vertical dashed marker (e.g. "you" on a rate axis). */
  xRef?: number
  xRefLabel?: string
  /** Percentile band drawn behind the lines. */
  band?: { upper: number[]; lower: number[]; color: string }
  /** Names for the band's edges in the hover readout; omit to keep the band out of it. */
  bandLabels?: { upper: string; lower: string }
  /** Horizontal dashed reference (e.g. the starting bankroll). */
  yRef?: number
  refLabel?: string
  xTickFormat: (v: number) => string
  yTickFormat?: (v: number) => string
  /** Title of the hover readout, e.g. "After 120 bets". Defaults to xTickFormat. */
  xHoverLabel?: (v: number) => string
  /** Value formatting inside the hover readout. */
  hoverValueFormat?: (v: number) => string
  extraHover?: HoverExtra[]
  figure?: string
  caption: string
  ariaLabel: string
  exportStats?: ExportStat[]
  /** Frame shape overrides; defaults keep the original station canvas. */
  ratio?: number
  maxHeight?: number
}

/**
 * The stations' shared canvas: an optional middle-80% band, faint sample
 * paths, and headline series, on the toolkit's exportable chart frame.
 * Hovering shows a crosshair with every labeled series' value at that point.
 */
export function StationChart({
  figure,
  caption,
  ariaLabel,
  exportStats,
  ratio = 0.46,
  maxHeight = 380,
  ...inner
}: StationChartProps) {
  return (
    <ChartFrame
      ratio={ratio}
      maxHeight={maxHeight}
      figure={figure}
      caption={caption}
      ariaLabel={ariaLabel}
      exportStats={exportStats}
    >
      <Inner {...inner} />
    </ChartFrame>
  )
}

function Inner({
  x,
  lines,
  yMax,
  yMin = 0,
  xRef,
  xRefLabel,
  band,
  bandLabels,
  yRef,
  refLabel,
  xTickFormat,
  yTickFormat = formatUSDCompact,
  xHoverLabel,
  hoverValueFormat = formatUSDWhole,
  extraHover,
}: Omit<StationChartProps, 'figure' | 'caption' | 'ariaLabel' | 'exportStats'>) {
  const { innerWidth, innerHeight } = useChart()
  const xMax = x[x.length - 1] || 1

  const xs = useMemo(() => scaleLinear().domain([x[0] ?? 0, xMax]).range([0, innerWidth]), [x, xMax, innerWidth])
  const ys = useMemo(() => scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]), [yMin, yMax, innerHeight])

  const toPath = (arr: number[]) =>
    arr.map((v, i) => `${i ? 'L' : 'M'}${xs(x[i]!).toFixed(1)},${ys(Math.min(v, yMax)).toFixed(1)}`).join(' ')

  const bandPoints = band
    ? [
        ...x.map((v, i) => `${xs(v).toFixed(1)},${ys(Math.min(band.upper[i]!, yMax)).toFixed(1)}`),
        ...x.map((v, i) => `${xs(v).toFixed(1)},${ys(Math.min(band.lower[i]!, yMax)).toFixed(1)}`).reverse(),
      ].join(' ')
    : null

  // Hover readout: the most prominent line (drawn last) is listed first, then
  // the band's edges, then value-only extras. Probe over point indices so the
  // parallel arrays stay untouched.
  const indices = useMemo(() => x.map((_, i) => i), [x])
  const seriesFromYs = (label: string, arr: number[], color?: string): HoverSeries<number> => ({
    label,
    color,
    y: (i) => arr[i]!,
    dotY: (i) => Math.min(arr[i]!, yMax),
    format: hoverValueFormat,
  })
  const hoverSeries: HoverSeries<number>[] = [
    ...lines
      .filter((l) => l.label)
      .reverse()
      .map((l) => seriesFromYs(l.label!, l.ys, l.color)),
    ...(band && bandLabels
      ? [seriesFromYs(bandLabels.upper, band.upper, band.color), seriesFromYs(bandLabels.lower, band.lower, band.color)]
      : []),
    ...(extraHover ?? []).map((e) => ({ ...seriesFromYs(e.label, e.ys, e.color), dot: false })),
  ]

  return (
    <>
      <Gridlines y={ys} ticks={5} />
      <AxisLeft y={ys} ticks={5} format={yTickFormat} />
      <AxisBottom x={xs} ticks={6} format={xTickFormat} />

      {bandPoints && <polygon points={bandPoints} fill={band!.color} opacity={0.16} />}

      {yRef != null && (
        <>
          <line
            x1={0}
            x2={innerWidth}
            y1={ys(yRef)}
            y2={ys(yRef)}
            stroke="var(--text-primary)"
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.5}
          />
          {refLabel && (
            <text x={6} y={ys(yRef) - 6} fontSize={11} fill="var(--text-faint)">
              {refLabel}
            </text>
          )}
        </>
      )}

      {xRef != null && (
        <>
          <line
            x1={xs(xRef)}
            x2={xs(xRef)}
            y1={0}
            y2={innerHeight}
            stroke="var(--c-accent)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          {xRefLabel && (
            <text x={xs(xRef) + 5} y={12} fontSize={11} fill="var(--c-accent)">
              {xRefLabel}
            </text>
          )}
        </>
      )}

      {lines.map((l, i) => (
        <path
          key={i}
          d={toPath(l.ys)}
          fill="none"
          stroke={l.color}
          strokeWidth={l.width ?? 2.5}
          strokeDasharray={l.dashed ? '5 4' : undefined}
          opacity={l.opacity ?? 1}
          strokeLinejoin="round"
        />
      ))}

      <HoverProbe
        data={indices}
        x={(i) => x[i]!}
        xScale={xs}
        yScale={ys}
        series={hoverSeries}
        xLabel={xHoverLabel ?? xTickFormat}
      />
    </>
  )
}
