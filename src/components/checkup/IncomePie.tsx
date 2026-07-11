import { Callout } from '../../design-system'
import { ChartFrame, useChart } from '../../design-system/chart'
import { fmtPct, formatUSDWhole } from '../../lib/format'
import type { LineItem } from '../../data/checkupData'
import styles from './IncomePie.module.css'

const CARDINAL = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

interface IncomePieProps {
  /** Take-home income from the budget's Money in list. */
  income: number
  expenses: LineItem[]
  totalSaving: number
  /** Income minus expenses minus saving; negative when the budget does not fit. */
  leftover: number
}

interface Slice {
  key: string
  label: string
  value: number
  fill: string
}

/** Expense slice colors: full-strength blends from cardinal to amber, in list order. */
function expenseFill(i: number, n: number): string {
  const p = n > 1 ? 100 - Math.round((i * 100) / (n - 1)) : 100
  return `color-mix(in oklab, ${CARDINAL} ${p}%, var(--c-series-2))`
}

/*
 * The planned budget as shares of take-home income: every dollar coming in is
 * an expense slice (cardinal-to-amber), the saving slice (green), or the
 * leftover (slate). The denominator is net income on purpose: a budget can
 * only allocate money that actually lands in the account. When the plan
 * exceeds income there is no valid income pie, so the shares fall back to the
 * outflows themselves and the caption says so.
 */
export function IncomePie({ income, expenses, totalSaving, leftover }: IncomePieProps) {
  if (income <= 0) {
    return (
      <Callout tone="mark" label="Add income first">
        Shares of income need an income. Fill in the <em>Money in</em> list above and this chart
        draws itself.
      </Callout>
    )
  }

  const overBudget = leftover < 0
  const spendRows = expenses.filter((e) => e.value > 0)
  const slices: Slice[] = spendRows.map((e, i) => ({
    key: e.key,
    label: e.label || 'Untitled row',
    value: e.value,
    fill: expenseFill(i, spendRows.length),
  }))
  if (totalSaving > 0) {
    slices.push({ key: 'saving', label: 'Saving', value: totalSaving, fill: GREEN })
  }
  if (!overBudget && leftover > 0) {
    slices.push({ key: 'leftover', label: 'Left over', value: leftover, fill: SLATE })
  }
  const denom = overBudget ? slices.reduce((s, x) => s + x.value, 0) : income

  return (
    <div className={styles.grid}>
      <div className={styles.chartCol}>
        <ChartFrame
          height={380}
          margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
          figure="Figure 1."
          caption={
            overBudget
              ? 'The plan adds up to more than take-home income, so these are shares of the planned outflows instead. Trim until the budget fits back inside the pie.'
              : 'Your planned budget as shares of take-home income. Warm colors are spent, green is kept on purpose, gray is left over.'
          }
          ariaLabel="Where your take-home income goes"
          expandable={false}
          exportStats={[
            { label: 'Take-home income', value: formatUSDWhole(income) },
            { label: 'Spending', value: formatUSDWhole(spendRows.reduce((s, e) => s + e.value, 0)), color: CARDINAL },
            { label: 'Saving', value: formatUSDWhole(totalSaving), color: GREEN },
            { label: 'Left over', value: formatUSDWhole(leftover), color: leftover >= 0 ? GREEN : CARDINAL },
          ]}
        >
          <PieSlices slices={slices} denom={denom} centerLabel={overBudget ? 'planned out' : 'take-home'} centerValue={denom} />
        </ChartFrame>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendHead}>
          <span />
          <span className={styles.legendTitle} />
          <span className={`${styles.legendNum} ${styles.legendColHead}`}>$ / month</span>
          <span className={`${styles.legendNum} ${styles.legendColHead}`}>Share</span>
        </div>
        {slices.map((s) => (
          <div key={s.key} className={styles.legendRow}>
            <span className={styles.chip} style={{ background: s.fill }} aria-hidden="true" />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={`${styles.legendNum} tnum`}>{formatUSDWhole(s.value)}</span>
            <span className={`${styles.legendNum} ${styles.legendPct} tnum`}>{fmtPct((s.value / denom) * 100, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TAU = Math.PI * 2

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

function PieSlices({
  slices,
  denom,
  centerLabel,
  centerValue,
}: {
  slices: Slice[]
  denom: number
  centerLabel: string
  centerValue: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const cx = innerWidth / 2
  const cy = innerHeight / 2
  const r1 = Math.min(innerWidth, innerHeight) / 2 - 8
  const r0 = r1 * 0.55

  let angle = -TAU / 4
  return (
    <g>
      {slices.map((s) => {
        const a0 = angle
        // A hair under the full share so a rounding overrun never wraps past the start.
        const a1 = a0 + Math.min(s.value / denom, 0.9999) * TAU
        angle = a1
        return (
          <path key={s.key} d={arcPath(cx, cy, r0, r1, a0, a1)} fill={s.fill} stroke="var(--surface)" strokeWidth={2}>
            <title>{`${s.label}: ${formatUSDWhole(s.value)} (${fmtPct((s.value / denom) * 100, 0)})`}</title>
          </path>
        )
      })}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize={30}
        fontWeight={650}
        fill="var(--text-primary)"
        className="tnum"
        pointerEvents="none"
      >
        {formatUSDWhole(centerValue)}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize={12} fill="var(--text-muted)" pointerEvents="none">
        {centerLabel}
      </text>
    </g>
  )
}
