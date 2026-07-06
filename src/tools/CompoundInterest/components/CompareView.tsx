import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
} from '../../../design-system/chart'
import { Button, ScenarioChip } from '../../../design-system'
import { growthSeries, type SeriesPoint } from '../../../lib/finance'
import { formatUSDCompact, formatUSDWhole, formatYears } from '../../../lib/format'
import { freqOf, rateOf, type Scenario } from '../state'
import styles from './CompareView.module.css'

const SERIES_COLORS = [
  'var(--c-series-2)',
  'var(--c-series-3)',
  'var(--c-series-5)',
  'var(--c-series-4)',
]

interface Variant {
  id: string
  label: string
  apply: (s: Scenario) => Scenario
}

const VARIANTS: Variant[] = [
  { id: 'rate2x', label: 'Double the rate', apply: (s) => ({ ...s, ratePct: s.ratePct * 2 }) },
  { id: 'rateHalf', label: 'Half the rate', apply: (s) => ({ ...s, ratePct: s.ratePct / 2 }) },
  { id: 'plus10', label: '10 more years', apply: (s) => ({ ...s, years: Math.min(60, s.years + 10) }) },
  { id: 'principal2x', label: 'Double the start', apply: (s) => ({ ...s, principal: s.principal * 2 }) },
]

interface Curve {
  id: string
  label: string
  color: string
  scenario: Scenario
  series: SeriesPoint[]
  finalBalance: number
}

function seriesFor(s: Scenario): { series: SeriesPoint[]; finalBalance: number } {
  const { points, final } = growthSeries({
    principal: s.principal,
    annualRate: rateOf(s),
    years: s.years,
    freq: freqOf(s),
    contribution: s.contribution ?? undefined,
  })
  return { series: points, finalBalance: final.balance }
}

export function CompareView({ scenario }: { scenario: Scenario }) {
  const [active, setActive] = useState<string[]>(['rate2x'])

  const base = useMemo(() => {
    const { series, finalBalance } = seriesFor(scenario)
    return {
      id: 'base',
      label: 'Your scenario',
      color: 'var(--c-series-1)',
      scenario,
      series,
      finalBalance,
    } as Curve
  }, [scenario])

  const ghosts = useMemo<Curve[]>(() => {
    return active
      .map((id, idx) => {
        const variant = VARIANTS.find((v) => v.id === id)
        if (!variant) return null
        const s = variant.apply(scenario)
        const { series, finalBalance } = seriesFor(s)
        return {
          id,
          label: variant.label,
          color: SERIES_COLORS[idx % SERIES_COLORS.length]!,
          scenario: s,
          series,
          finalBalance,
        } as Curve
      })
      .filter((c): c is Curve => c !== null)
  }, [active, scenario])

  const curves = [base, ...ghosts]
  const maxYears = Math.max(...curves.map((c) => c.scenario.years))
  const maxBalance = Math.max(...curves.map((c) => c.finalBalance))

  function toggle(id: string) {
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Change one thing at a time and watch the curves separate. Comparing scenarios side by side
        is where the levers of compounding (rate, time, and starting amount) reveal their very
        different power.
      </p>

      <div className={styles.chips}>
        {VARIANTS.map((v) => (
          <ScenarioChip
            key={v.id}
            label={v.label}
            active={active.includes(v.id)}
            swatch={active.includes(v.id) ? SERIES_COLORS[active.indexOf(v.id) % SERIES_COLORS.length] : undefined}
            onClick={() => toggle(v.id)}
          />
        ))}
        {active.length > 0 && (
          <Button variant="link" size="sm" onClick={() => setActive([])}>
            Clear
          </Button>
        )}
      </div>

      <ChartFrame
        ratio={0.5}
        figure="Figure 3."
        caption="Each line is your scenario with a single parameter changed. The solid green line is your current setup."
        margin={{ top: 20, right: 150, bottom: 36, left: 64 }}
        ariaLabel="Overlaid growth curves comparing variations of the scenario"
      >
        <CompareInner curves={curves} maxYears={maxYears} maxBalance={maxBalance} />
      </ChartFrame>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Scenario</th>
            <th className={styles.numCol}>Final balance</th>
            <th className={styles.numCol}>vs. yours</th>
          </tr>
        </thead>
        <tbody>
          {curves.map((c) => {
            const delta = c.finalBalance - base.finalBalance
            return (
              <tr key={c.id}>
                <td>
                  <span className={styles.swatch} style={{ background: c.color }} />
                  {c.label}
                </td>
                <td className={`${styles.numCol} tnum`}>{formatUSDWhole(c.finalBalance)}</td>
                <td className={`${styles.numCol} tnum`}>
                  {c.id === 'base' ? '—' : `${delta >= 0 ? '+' : '−'}${formatUSDWhole(Math.abs(delta))}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CompareInner({
  curves,
  maxYears,
  maxBalance,
}: {
  curves: Curve[]
  maxYears: number
  maxBalance: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const x = scaleLinear().domain([0, maxYears]).range([0, innerWidth])
  const y = scaleLinear().domain([0, maxBalance * 1.04]).range([innerHeight, 0]).nice()

  // The longest curve's points carry the hover's x grid; curves that end
  // sooner report NaN past their horizon and drop out of the tooltip.
  const longest = curves.reduce((a, b) => (b.scenario.years > a.scenario.years ? b : a), curves[0]!)
  const balanceAt = (c: Curve, t: number): number => {
    if (t > c.scenario.years + 1e-9) return NaN
    let best = c.series[0]!
    for (const p of c.series) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p
    return best.balance
  }

  return (
    <>
      <Gridlines y={y} ticks={5} />
      <AxisLeft y={y} ticks={5} format={(v) => formatUSDCompact(v)} />
      <AxisBottom x={x} ticks={6} format={(v) => (v === 0 ? '0' : `${v}y`)} />
      {curves.map((c) => {
        const last = c.series[c.series.length - 1]!
        const isBase = c.id === 'base'
        return (
          <g key={c.id}>
            <LineSeries
              data={c.series}
              x={(d) => d.t}
              y={(d) => d.balance}
              xScale={x}
              yScale={y}
              stroke={c.color}
              width={isBase ? 2.75 : 1.75}
            />
            <circle cx={x(last.t)} cy={y(last.balance)} r={3.5} fill={c.color} />
            <text x={x(last.t) + 8} y={y(last.balance)} dy="0.32em" className={styles.endLabel} fill={c.color}>
              {formatUSDCompact(last.balance)}
            </text>
          </g>
        )
      })}

      <HoverProbe
        data={longest.series}
        x={(d: SeriesPoint) => d.t}
        xScale={x}
        yScale={y}
        xLabel={(v) => (v === 0 ? 'Start' : `After ${formatYears(v)}`)}
        series={curves.map((c) => ({
          label: c.label,
          color: c.color,
          y: (d: SeriesPoint) => balanceAt(c, d.t),
          format: formatUSDWhole,
        }))}
      />
    </>
  )
}
