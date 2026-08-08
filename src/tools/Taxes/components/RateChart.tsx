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
import { FICA, type Earners, type FilingStatus } from '../data2026'
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
  federalDeduction,
  includeState = true,
  includePayroll = true,
  earners = 1,
  caption,
  exportStats,
}: {
  gross: number
  status: FilingStatus
  contribution401k: number
  stateCode: string
  stateName: string
  /** The federal deduction in force (standard, itemized, or zero). */
  federalDeduction: number
  /** Leave state or payroll tax out of both lines (Tax Advantages toggles). */
  includeState?: boolean
  includePayroll?: boolean
  /** Workers earning the wages; two earners split them evenly, so the
   *  per-worker Social Security cap bites at twice the household income. */
  earners?: Earners
  caption: string
  exportStats?: ExportStat[]
}) {
  // Sweep far enough to always show the Social Security cap (per worker, so
  // a two-earner household reaches it at twice the income), and past the
  // reader's own income so their marker never sits on the edge.
  const xMax = Math.max(
    300_000,
    gross * 1.5,
    includePayroll ? FICA.ssWageBase * earners * 1.3 : 0
  )
  const include = useMemo(
    () => ({ state: includeState, payroll: includePayroll }),
    [includeState, includePayroll]
  )
  const points = useMemo(() => {
    const N = 280
    const step = xMax / N
    const taxAt = (g: number) =>
      totalTaxAt(g, status, contribution401k, stateCode, federalDeduction, include, earners)
    const pts: RatePoint[] = []
    for (let i = 0; i <= N; i++) {
      const g = i * step
      const tax = taxAt(g)
      pts.push({
        gross: g,
        // At $0 the ratio is 0/0; take its limit numerically: the tax rate on
        // the first dollar (7.65% with payroll included, 0 without).
        effective: g > 0 ? tax / g : taxAt(1) - tax,
        // The rate on literally the next dollar, so the marginal line reads
        // the true bracket at every sample instead of blending across a step.
        marginal: taxAt(g + 1) - tax,
      })
    }
    return pts
  }, [xMax, status, contribution401k, stateCode, federalDeduction, include, earners])

  return (
    <ChartFrame
      ratio={0.46}
      maxHeight={440}
      figure="Figure 1."
      caption={caption}
      exportStats={exportStats}
      ariaLabel={`Marginal and effective tax rates across incomes for a ${status === 'mfj' ? 'married' : 'single'} filer${stateName ? ` in ${stateName}` : ''}`}
    >
      <Inner points={points} gross={gross} status={status} contribution401k={contribution401k} stateCode={stateCode} federalDeduction={federalDeduction} include={include} earners={earners} xMax={xMax} />
    </ChartFrame>
  )
}

function Inner({
  points,
  gross,
  status,
  contribution401k,
  stateCode,
  federalDeduction,
  include,
  earners,
  xMax,
}: {
  points: RatePoint[]
  gross: number
  status: FilingStatus
  contribution401k: number
  stateCode: string
  federalDeduction: number
  include: { state: boolean; payroll: boolean }
  earners: Earners
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
  // The marginal rate is the tax on literally the next dollar of wages.
  const taxAt = (g: number) =>
    totalTaxAt(g, status, contribution401k, stateCode, federalDeduction, include, earners)
  const ownTax = taxAt(gross)
  const ownEffective = gross > 0 ? ownTax / gross : 0
  const ownMarginal = taxAt(gross + 1) - ownTax

  // Where the Social Security cap bites: mark the marginal rate just past it.
  // The cap is per worker, so two even earners reach it at twice the
  // household income. Without payroll tax in the lines there is no dip.
  const cap = FICA.ssWageBase * earners
  const pastCap = taxAt(cap + 1_001) - taxAt(cap + 1_000)
  const preCap = taxAt(cap - 1_000) - taxAt(cap - 1_001)
  const showCap = include.payroll && cap < xMax * 0.92 && Math.abs(x(cap) - x(gross)) > innerWidth * 0.12

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
