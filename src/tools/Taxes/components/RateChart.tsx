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
  VMarker,
  useChart,
  type ExportStat,
} from '../../../design-system/chart'
import { formatPercent, formatUSDCompact } from '../../../lib/format'
import { FICA, type FilingStatus } from '../data2026'
import { totalTaxAt } from '../compute'

interface RatePoint {
  gross: number
  effective: number
  marginal: number
}

/**
 * The lesson's central figure: the effective (average) rate and the all-in
 * marginal rate, swept across incomes with the reader's own position marked.
 * The marginal line steps up at every bracket edge and DROPS at the Social
 * Security wage cap — the effective line climbs smoothly and never catches it.
 */
export function RateChart({
  gross,
  status,
  contribution401k,
  stateCode,
  stateName,
  caption,
  exportStats,
}: {
  gross: number
  status: FilingStatus
  contribution401k: number
  stateCode: string
  stateName: string
  caption: string
  exportStats?: ExportStat[]
}) {
  // Sweep far enough to always show the Social Security cap, and past the
  // reader's own income so their marker never sits on the edge.
  const xMax = Math.max(300_000, gross * 1.5)
  const points = useMemo(() => {
    const N = 280
    const step = xMax / N
    const taxes: number[] = []
    for (let i = 0; i <= N; i++) taxes.push(totalTaxAt(i * step, status, contribution401k, stateCode))
    const pts: RatePoint[] = []
    for (let i = 0; i < N; i++) {
      const g = i * step
      pts.push({
        gross: g,
        // At $0 the ratio is 0/0; its limit is the payroll rate on the first
        // dollar, so the line starts at 7.65% instead of jumping from zero.
        effective: g > 0 ? taxes[i] / g : (taxes[1] - taxes[0]) / step,
        marginal: (taxes[i + 1] - taxes[i]) / step,
      })
    }
    return pts
  }, [xMax, status, contribution401k, stateCode])

  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={440}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Marginal and effective tax rates across incomes for a ${status === 'mfj' ? 'married' : 'single'} filer in ${stateName}`}
    >
      <Inner points={points} gross={gross} status={status} contribution401k={contribution401k} stateCode={stateCode} xMax={xMax} />
    </ChartFrame>
  )
}

function Inner({
  points,
  gross,
  status,
  contribution401k,
  stateCode,
  xMax,
}: {
  points: RatePoint[]
  gross: number
  status: FilingStatus
  contribution401k: number
  stateCode: string
  xMax: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const yMax = Math.max(...points.map((p) => p.marginal)) * 1.18

  const x = useMemo(() => scaleLinear().domain([0, xMax]).range([0, innerWidth]), [xMax, innerWidth])
  const y = useMemo(
    () => scaleLinear().domain([0, yMax || 0.1]).range([innerHeight, 0]).nice(),
    [yMax, innerHeight]
  )

  // The reader's own two rates, computed exactly (not read off the samples).
  const ownTax = totalTaxAt(gross, status, contribution401k, stateCode)
  const ownEffective = gross > 0 ? ownTax / gross : 0
  const ownMarginal = (totalTaxAt(gross + 100, status, contribution401k, stateCode) - ownTax) / 100

  // Where the Social Security cap bites: mark the marginal rate just past it.
  const cap = FICA.ssWageBase
  const pastCap = (totalTaxAt(cap + 1_100, status, contribution401k, stateCode) - totalTaxAt(cap + 1_000, status, contribution401k, stateCode)) / 100
  const preCap = (totalTaxAt(cap - 1_000, status, contribution401k, stateCode) - totalTaxAt(cap - 1_100, status, contribution401k, stateCode)) / 100
  const showCap = cap < xMax * 0.92 && Math.abs(x(cap) - x(gross)) > innerWidth * 0.12

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatPercent(v, 0)} />
      <AxisBottom x={x} ticks={6} format={(v) => formatUSDCompact(v)} />

      <LineSeries
        data={points}
        x={(d: RatePoint) => d.gross}
        y={(d: RatePoint) => d.marginal}
        xScale={x}
        yScale={y}
        stroke="var(--c-accent)"
        width={2}
      />
      <LineSeries
        data={points}
        x={(d: RatePoint) => d.gross}
        y={(d: RatePoint) => d.effective}
        xScale={x}
        yScale={y}
        stroke="var(--c-series-1)"
        width={2.5}
        draw
      />

      {showCap && (
        <Annotation
          x={x(cap)}
          y={y(pastCap)}
          dx={0}
          // Clear the pre-cap plateau, which sits above the anchor point.
          dy={y(Math.max(preCap, pastCap)) - y(pastCap) - 18}
          label="Social Security tax caps out"
          align="middle"
          tone="ink"
        />
      )}

      <VMarker x={gross} xScale={x} label={`you · ${formatUSDCompact(gross)}`} />
      {(() => {
        // Text drops below each dot so it clears the line running through it;
        // then keep the two labels from colliding when the rates sit close
        // together (very low incomes, where both are near the payroll rate).
        const yMarginal = y(ownMarginal)
        const yEffective = y(ownEffective)
        let tMarginal = yMarginal + 16
        let tEffective = yEffective + 16
        if (Math.abs(tMarginal - tEffective) < 16) {
          const mid = (tMarginal + tEffective) / 2
          tMarginal = mid - 8
          tEffective = mid + 8
        }
        return (
          <>
            <EndLabel x={x(gross)} y={yMarginal} textDy={tMarginal - yMarginal} text={`${formatPercent(ownMarginal, 1)} marginal`} color="var(--c-accent)" />
            <EndLabel x={x(gross)} y={yEffective} textDy={tEffective - yEffective} text={`${formatPercent(ownEffective, 1)} effective`} color="var(--c-series-1)" />
          </>
        )
      })()}

      <HoverProbe
        data={points}
        x={(d: RatePoint) => d.gross}
        xScale={x}
        yScale={y}
        xLabel={(v) => `${formatUSDCompact(v)} gross income`}
        series={[
          { label: 'Marginal rate', color: 'var(--c-accent)', y: (d: RatePoint) => d.marginal, format: (v) => formatPercent(v, 1) },
          { label: 'Effective rate', color: 'var(--c-series-1)', y: (d: RatePoint) => d.effective, format: (v) => formatPercent(v, 1) },
        ]}
      />
    </>
  )
}
