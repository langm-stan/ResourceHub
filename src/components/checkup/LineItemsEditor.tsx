import { formatUSDWhole } from '../../lib/format'
import { newLineItem, sumItems, type LineItem } from '../../data/checkupData'
import styles from './LineItemsEditor.module.css'

interface LineItemsEditorProps {
  title: string
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  accent?: string
  addLabel?: string
  /** Plain-language "what belongs here" line under the title. */
  hint?: string
}

/**
 * Free-form money rows: a label, an amount, a remove button, and an add
 * button. Ported from the Toolkit's Budgeting tool; the persistence lives in
 * whatever `onChange` writes to (here, useFinancialSnapshot → localStorage).
 */
export function LineItemsEditor({
  title,
  items,
  onChange,
  accent,
  addLabel = 'Add a row',
  hint,
}: LineItemsEditorProps) {
  function set(key: string, patch: Partial<LineItem>) {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  function remove(key: string) {
    onChange(items.filter((it) => it.key !== key))
  }
  function add() {
    onChange([...items, newLineItem()])
  }

  return (
    <div className={styles.group}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={`${styles.total} tnum`} style={accent ? { color: accent } : undefined}>
          {formatUSDWhole(sumItems(items))}
        </span>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.rows}>
        {items.map((it) => (
          <div key={it.key} className={styles.row}>
            <input
              className={styles.label}
              value={it.label}
              placeholder="Label"
              onChange={(e) => set(it.key, { label: e.target.value })}
            />
            <div className={styles.amountWrap}>
              <span className={styles.dollar}>$</span>
              <input
                className={`${styles.amount} tnum`}
                inputMode="decimal"
                value={it.value === 0 ? '' : String(it.value)}
                placeholder="0"
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9.\-]/g, ''))
                  set(it.key, { value: Number.isFinite(n) ? n : 0 })
                }}
              />
            </div>
            <button
              type="button"
              className={styles.remove}
              onClick={() => remove(it.key)}
              aria-label={`Remove ${it.label || 'row'}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.add} onClick={add}>
        + {addLabel}
      </button>
    </div>
  )
}
