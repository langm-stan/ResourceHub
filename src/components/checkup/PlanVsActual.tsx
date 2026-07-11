import { Callout } from '../../design-system'
import { fmtPct, formatUSDWhole } from '../../lib/format'
import { hasActuals, sumActuals, sumItems, type LineItem } from '../../data/checkupData'
import styles from './PlanVsActual.module.css'

interface PlanVsActualProps {
  /** Take-home income from the budget, the denominator of the share-of-income column. */
  income: number
  /** The budget's expense rows; `value` is the plan, `actual` is what was spent. */
  expenses: LineItem[]
  /** The pay-yourself-first rows, partitioned from the expenses: an outflow too, but one you keep. */
  saving: LineItem[]
  onExpensesChange: (items: LineItem[]) => void
  onSavingChange: (items: LineItem[]) => void
}

const tracked = (it: LineItem) => typeof it.actual === 'number' && Number.isFinite(it.actual)

function withActual(items: LineItem[], key: string, raw: string): LineItem[] {
  return items.map((it) => {
    if (it.key !== key) return it
    if (raw.trim() === '') {
      const { actual: _drop, ...rest } = it
      return rest
    }
    const n = Number(raw.replace(/[^0-9.\-]/g, ''))
    return { ...it, actual: Number.isFinite(n) ? n : 0 }
  })
}

/*
 * The reality check next to the budget: one row per outflow, with the planned
 * amount, a field for what actually happened, the gap, and each row's share
 * of the money that really went out. Expenses and saving are partitioned
 * because their gaps read in opposite directions: spending over plan is the
 * problem on one side, setting aside less than planned on the other. Rows are
 * added, renamed, and removed in the budget's lists; this table only edits
 * the actual column, stored on the same snapshot rows.
 */
export function PlanVsActual({ income, expenses, saving, onExpensesChange, onSavingChange }: PlanVsActualProps) {
  const plannedExp = sumItems(expenses)
  const actualExp = sumActuals(expenses)
  const plannedSav = sumItems(saving)
  const actualSav = sumActuals(saving)
  const anyActuals = hasActuals(expenses) || hasActuals(saving)
  // Two shares per row: of the money actually spent (expense rows only), and
  // of take-home income (every row).
  const shareOfSpending = (v: number) => (actualExp > 0 ? fmtPct((v / actualExp) * 100, 0) : '')
  const shareOfIncome = (v: number) => (income > 0 ? fmtPct((v / income) * 100, 0) : '')

  const overspend = actualExp - plannedExp
  const savShortfall = hasActuals(saving) ? plannedSav - actualSav : 0

  const overs = expenses
    .filter((it) => tracked(it) && it.actual! - it.value > 0)
    .sort((a, b) => b.actual! - b.value - (a.actual! - a.value))
    .slice(0, 2)

  /** One data row. `flip` inverts the gap colors: for saving, under plan is the bad direction. */
  const renderRow = (it: LineItem, flip: boolean, onChange: (items: LineItem[]) => void, items: LineItem[]) => {
    const isTracked = tracked(it)
    const gap = isTracked ? it.actual! - it.value : 0
    const bad = flip ? gap < 0 : gap > 0
    const good = flip ? gap > 0 : gap < 0
    return (
      <div key={it.key} className={styles.rowGroup}>
        <span className={styles.itemLabel}>{it.label || 'Untitled row'}</span>
        <span className={`${styles.num} ${styles.cell} tnum`}>{formatUSDWhole(it.value)}</span>
        <div className={styles.cell}>
          <div className={styles.actualWrap}>
            <span className={styles.dollar}>$</span>
            <input
              className={`${styles.actual} tnum`}
              inputMode="decimal"
              value={isTracked ? String(it.actual) : ''}
              placeholder="0"
              aria-label={`${flip ? 'Actually set aside for' : 'Actually spent on'} ${it.label || 'untitled row'}`}
              onChange={(e) => onChange(withActual(items, it.key, e.target.value))}
            />
          </div>
        </div>
        <span className={`${styles.num} ${styles.cell} tnum ${bad ? styles.over : good ? styles.under : styles.even}`}>
          {isTracked ? (gap > 0 ? `+${formatUSDWhole(gap)}` : gap < 0 ? `−${formatUSDWhole(-gap)}` : '$0') : ''}
        </span>
        <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>
          {isTracked && !flip ? shareOfSpending(it.actual!) : ''}
        </span>
        <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>
          {isTracked ? shareOfIncome(it.actual!) : ''}
        </span>
      </div>
    )
  }

  /** A partition subtotal. Same flip rule as its rows. */
  const renderTotal = (label: string, planned: number, actual: number, any: boolean, flip: boolean) => {
    const gap = actual - planned
    const bad = flip ? gap < 0 : gap > 0
    const good = flip ? gap > 0 : gap < 0
    return (
      <div className={`${styles.rowGroup} ${styles.totals}`}>
        <span>{label}</span>
        <span className={`${styles.num} ${styles.cell} tnum`}>{formatUSDWhole(planned)}</span>
        <span className={`${styles.num} ${styles.cell} tnum`}>{any ? formatUSDWhole(actual) : ''}</span>
        <span className={`${styles.num} ${styles.cell} tnum ${bad ? styles.over : good ? styles.under : styles.even}`}>
          {any ? (gap > 0 ? `+${formatUSDWhole(gap)}` : gap < 0 ? `−${formatUSDWhole(-gap)}` : '$0') : ''}
        </span>
        <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>
          {any && !flip ? shareOfSpending(actual) : ''}
        </span>
        <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>
          {any ? shareOfIncome(actual) : ''}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.stack}>
      <div className={styles.scroll}>
        <div className={styles.table}>
          <span className={styles.colHead}>Expense</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Planned</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Actual</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Difference</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Share of spending</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Share of income</span>

          {expenses.map((it) => renderRow(it, false, onExpensesChange, expenses))}
          {renderTotal('Total spending', plannedExp, actualExp, hasActuals(expenses), false)}

          <span className={styles.partition}>Saving (pay yourself first)</span>
          {saving.map((it) => renderRow(it, true, onSavingChange, saving))}
          {renderTotal('Total saving', plannedSav, actualSav, hasActuals(saving), true)}
        </div>
      </div>

      {!anyActuals ? (
        <Callout tone="note" label="How to use this">
          Enter what you actually spent next to each expense, and what you actually set aside next
          to each saving row. The difference column shows where the plan and reality disagree; for
          saving, the shortfall is the number to watch.
        </Callout>
      ) : overspend > 0 ? (
        <Callout tone="mark" label="Where to cut">
          You spent <strong>{formatUSDWhole(overspend)}</strong> more than planned.
          {overs.length > 0 && (
            <>
              {' '}The biggest gap{overs.length > 1 ? 's were' : ' was'}{' '}
              {overs.map((it, i) => (
                <span key={it.key}>
                  {i > 0 && ' and '}
                  <strong>{it.label || 'an untitled row'}</strong> (+{formatUSDWhole(it.actual! - it.value)})
                </span>
              ))}
              . Start there: one real cut in a large category does more than trimming five small ones.
            </>
          )}
          {savShortfall > 0 && (
            <>
              {' '}You also set aside <strong>{formatUSDWhole(savShortfall)}</strong> less than
              planned; the overspending came out of paying yourself.
            </>
          )}
        </Callout>
      ) : savShortfall > 0 ? (
        <Callout tone="mark" label="Pay yourself first">
          Spending stayed on plan, but you set aside{' '}
          <strong>{formatUSDWhole(savShortfall)}</strong> less than you planned to save. Treat the
          saving rows like any other bill: they get paid first, not with what happens to be left.
        </Callout>
      ) : (
        <Callout tone="note" label="On plan">
          Spending stayed at or under plan and the saving rows got paid. If more than planned was
          left over, the <em>Your Goal</em> tab shows what investing it could become.
        </Callout>
      )}
    </div>
  )
}
