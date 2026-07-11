import { Callout } from '../../design-system'
import { fmtPct, formatUSDWhole } from '../../lib/format'
import { hasActuals, sumActuals, sumItems, type LineItem } from '../../data/checkupData'
import styles from './PlanVsActual.module.css'

interface PlanVsActualProps {
  /** The budget's expense rows; `value` is the plan, `actual` is what was spent. */
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}

/*
 * The reality check next to the budget: one row per expense, with the planned
 * amount from the Money out list, a field for what was actually spent, the
 * gap between the two, and each expense's share of actual spending. Rows are
 * added, renamed, and removed in the Money out list; this table only edits
 * the "actually spent" column, stored on the same snapshot rows.
 */
export function PlanVsActual({ items, onChange }: PlanVsActualProps) {
  const totalPlanned = sumItems(items)
  const totalActual = sumActuals(items)
  const anyActuals = hasActuals(items)
  const totalGap = totalActual - totalPlanned

  function setActual(key: string, raw: string) {
    onChange(
      items.map((it) => {
        if (it.key !== key) return it
        if (raw.trim() === '') {
          const { actual: _drop, ...rest } = it
          return rest
        }
        const n = Number(raw.replace(/[^0-9.\-]/g, ''))
        return { ...it, actual: Number.isFinite(n) ? n : 0 }
      })
    )
  }

  const overs = items
    .filter((it) => typeof it.actual === 'number' && it.actual - it.value > 0)
    .sort((a, b) => (b.actual! - b.value) - (a.actual! - a.value))
    .slice(0, 2)

  return (
    <div className={styles.stack}>
      <div className={styles.scroll}>
        <div className={styles.table}>
          <span className={styles.colHead}>Expense</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Planned</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Actual</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Difference</span>
          <span className={`${styles.colHead} ${styles.cell} ${styles.right}`}>Share</span>

          {items.map((it) => {
            const tracked = typeof it.actual === 'number' && Number.isFinite(it.actual)
            const gap = tracked ? it.actual! - it.value : 0
            const share = tracked && totalActual > 0 ? (it.actual! / totalActual) * 100 : null
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
                      value={tracked ? String(it.actual) : ''}
                      placeholder="0"
                      aria-label={`Actually spent on ${it.label || 'untitled row'}`}
                      onChange={(e) => setActual(it.key, e.target.value)}
                    />
                  </div>
                </div>
                <span
                  className={`${styles.num} ${styles.cell} tnum ${gap > 0 ? styles.over : gap < 0 ? styles.under : styles.even}`}
                >
                  {tracked ? (gap > 0 ? `+${formatUSDWhole(gap)}` : gap < 0 ? `−${formatUSDWhole(-gap)}` : '$0') : ''}
                </span>
                <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>
                  {share !== null ? fmtPct(share, 0) : ''}
                </span>
              </div>
            )
          })}

          <div className={`${styles.rowGroup} ${styles.totals}`}>
            <span>Total</span>
            <span className={`${styles.num} ${styles.cell} tnum`}>{formatUSDWhole(totalPlanned)}</span>
            <span className={`${styles.num} ${styles.cell} tnum`}>{anyActuals ? formatUSDWhole(totalActual) : ''}</span>
            <span
              className={`${styles.num} ${styles.cell} tnum ${totalGap > 0 ? styles.over : totalGap < 0 ? styles.under : styles.even}`}
            >
              {anyActuals
                ? totalGap > 0
                  ? `+${formatUSDWhole(totalGap)}`
                  : totalGap < 0
                    ? `−${formatUSDWhole(-totalGap)}`
                    : '$0'
                : ''}
            </span>
            <span className={`${styles.num} ${styles.cell} tnum ${styles.shareCell}`}>{anyActuals ? '100%' : ''}</span>
          </div>
        </div>
      </div>

      {!anyActuals ? (
        <Callout tone="note" label="How to use this">
          Enter what you actually spent last month next to each expense. The difference column shows
          where the plan and reality disagree, and the share column shows where the money really went.
        </Callout>
      ) : totalGap > 0 ? (
        <Callout tone="mark" label="Where to cut">
          You spent <strong>{formatUSDWhole(totalGap)}</strong> more than planned.
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
        </Callout>
      ) : (
        <Callout tone="note" label="On plan">
          You spent {totalGap === 0 ? 'exactly what you planned' : (
            <>
              <strong>{formatUSDWhole(-totalGap)}</strong> less than planned
            </>
          )}. If that money is not already earmarked, the <em>Your Goal</em> tab shows what investing
          it could become.
        </Callout>
      )}
    </div>
  )
}
