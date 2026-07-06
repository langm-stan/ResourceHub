import { useMemo, useState } from 'react'
import { scaleLinear, scalePoint } from 'd3-scale'
import { ChartFrame, HoverTip, useChart, AxisLeft } from '../../../design-system/chart'
import { Callout } from '../../../design-system'
import { effectiveAnnualRate, futureValue, type Frequency } from '../../../lib/finance'
import { formatPercent, formatUSDCompact, formatUSDWhole } from '../../../lib/format'
import { rateOf, type Scenario } from '../state'
import styles from './FrequencyExplorer.module.css'

const STEPS: { name: string; m: number }[] = [
  { name: 'Annual', m: 1 },
  { name: 'Semiannual', m: 2 },
  { name: 'Quarterly', m: 4 },
  { name: 'Monthly', m: 12 },
  { name: 'Daily', m: 365 },
  { name: 'Hourly', m: 8760 },
]

export function FrequencyExplorer({ scenario }: { scenario: Scenario }) {
  const r = rateOf(scenario)
  const P = scenario.principal || 1000
  const t = scenario.years

  const rows = useMemo(
    () =>
      STEPS.map((s) => {
        const freq: Frequency = { kind: 'periodic', m: s.m }
        return {
          ...s,
          ear: effectiveAnnualRate(r, freq),
          balance: futureValue(P, r, t, freq),
        }
      }),
    [r, P, t],
  )

  const continuousBalance = futureValue(P, r, t, { kind: 'continuous' })
  const continuousEar = effectiveAnnualRate(r, { kind: 'continuous' })
  const annualBalance = rows[0]!.balance
  const gap = continuousBalance - annualBalance

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Hold the principal, rate, and horizon fixed and compound more and more often. The balance
        climbs, but toward a ceiling rather than to infinity. That ceiling is{' '}
        <em>continuous compounding</em>, the moment the formula stops needing a period at all.
      </p>

      <ChartFrame
        ratio={0.42}
        figure="Figure 2."
        caption={`Final balance on ${formatUSDWhole(P)} at ${scenario.ratePct}% over ${t} years, as compounding grows more frequent. The dashed line is the continuous limit.`}
        margin={{ top: 24, right: 120, bottom: 40, left: 64 }}
        ariaLabel="Points approaching the continuous-compounding limit as frequency increases"
      >
        <ConvergenceInner rows={rows} continuousBalance={continuousBalance} annualBalance={annualBalance} />
      </ChartFrame>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Compounding</th>
              <th className={styles.numCol}>Per year</th>
              <th className={styles.numCol}>Effective rate</th>
              <th className={styles.numCol}>Balance after {t}y</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td className={`${styles.numCol} tnum`}>{row.m.toLocaleString()}</td>
                <td className={`${styles.numCol} tnum`}>{formatPercent(row.ear, 3)}</td>
                <td className={`${styles.numCol} tnum`}>{formatUSDWhole(row.balance)}</td>
              </tr>
            ))}
            <tr className={styles.limitRow}>
              <td>Continuous</td>
              <td className={`${styles.numCol} tnum`}>∞</td>
              <td className={`${styles.numCol} tnum`}>{formatPercent(continuousEar, 3)}</td>
              <td className={`${styles.numCol} tnum`}>{formatUSDWhole(continuousBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout tone="note" label="The punchline">
        Going from annual to continuous compounding adds just{' '}
        <strong>{formatUSDWhole(gap)}</strong> here. Frequency matters, but far less than the rate
        or the time horizon. The famous constant <em>e</em> is simply where{' '}
        <span className="tnum">(1 + 1/m)ᵐ</span> lands as <em>m</em> runs to infinity:
      </Callout>

      <ETable />
    </div>
  )
}

function ConvergenceInner({
  rows,
  continuousBalance,
  annualBalance,
}: {
  rows: { name: string; m: number; ear: number; balance: number }[]
  continuousBalance: number
  annualBalance: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const [hover, setHover] = useState<number | null>(null)
  const x = scalePoint()
    .domain(rows.map((r) => r.name))
    .range([0, innerWidth])
    .padding(0.5)
  const yMin = annualBalance * 0.999
  const yMax = continuousBalance * 1.001
  const y = scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]).nice()

  const hovered = hover == null ? null : rows[hover]

  return (
    <>
      <AxisLeft y={y} ticks={4} format={(v) => formatUSDCompact(v)} />
      <line
        x1={0}
        x2={innerWidth}
        y1={y(continuousBalance)}
        y2={y(continuousBalance)}
        className={styles.limitLine}
      />
      <text x={innerWidth + 8} y={y(continuousBalance)} dy="0.32em" className={styles.limitLabel}>
        continuous
      </text>
      <polyline
        points={rows.map((r) => `${x(r.name)},${y(r.balance)}`).join(' ')}
        className={styles.convLine}
      />
      {rows.map((r, i) => (
        <g key={r.name}>
          <circle cx={x(r.name)} cy={y(r.balance)} r={4} className={styles.convDot} />
          <text x={x(r.name)} y={innerHeight + 18} textAnchor="middle" className={styles.xLabel}>
            {r.name.slice(0, 4)}
          </text>
          {/* Generous invisible hit target for the hover readout. */}
          <circle
            cx={x(r.name)}
            cy={y(r.balance)}
            r={16}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      ))}
      {hovered && (
        <HoverTip
          px={x(hovered.name) ?? 0}
          title={`${hovered.name} compounding`}
          rows={[
            { label: 'Times per year', value: hovered.m.toLocaleString() },
            { label: 'Effective rate', value: formatPercent(hovered.ear, 3) },
            { label: 'Balance', value: formatUSDWhole(hovered.balance) },
          ]}
        />
      )}
    </>
  )
}

function ETable() {
  const ms = [1, 2, 4, 12, 365, 8760]
  return (
    <table className={styles.eTable}>
      <thead>
        <tr>
          <th className={styles.numCol}>m</th>
          {ms.map((m) => (
            <th key={m} className={`${styles.numCol} tnum`}>
              {m.toLocaleString()}
            </th>
          ))}
          <th className={`${styles.numCol} tnum`}>→ ∞</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>(1 + 1/m)ᵐ</td>
          {ms.map((m) => (
            <td key={m} className={`${styles.numCol} tnum`}>
              {Math.pow(1 + 1 / m, m).toFixed(4)}
            </td>
          ))}
          <td className={`${styles.numCol} tnum ${styles.eCell}`}>{Math.E.toFixed(4)}</td>
        </tr>
      </tbody>
    </table>
  )
}
