import { useEffect, useId, useState } from 'react'
import { keepSelectionOnMouseUp, selectOnFocus } from './selectOnFocus'
import styles from './NumberField.module.css'

interface NumberFieldProps {
  label?: string
  /** Accessible name when the visible label lives outside this component. */
  ariaLabel?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  precision?: number
  /** Thousands separators in the display (money: 1,000). Off for years and counts. */
  grouped?: boolean
}

/**
 * A precise numeric input. The displayed string is local while focused, and
 * committed/clamped on blur or Enter. Figures render in tabular mono.
 */
export function NumberField({
  label,
  ariaLabel,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  precision = 2,
  grouped = false,
}: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string>(format(value, precision, grouped))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(format(value, precision, grouped))
  }, [value, precision, editing])

  function commit(raw: string) {
    const cleaned = raw.replace(/[^0-9.\-]/g, '')
    const parsed = Number(cleaned)
    // An empty or unparseable entry reverts to the previous value rather than
    // committing 0 (Number('') is 0).
    if (cleaned === '' || Number.isNaN(parsed)) {
      setDraft(format(value, precision, grouped))
      return
    }
    let next = parsed
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    // Round to the field's precision so the stored value matches the display.
    const factor = 10 ** precision
    next = Math.round(next * factor) / factor
    onChange(next)
    setDraft(format(next, precision, grouped))
  }

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          id={id}
          className={`${styles.input} tnum`}
          inputMode="decimal"
          aria-label={label ? undefined : ariaLabel}
          value={draft}
          step={step}
          onFocus={(e) => {
            setEditing(true)
            selectOnFocus(e)
          }}
          onMouseUp={keepSelectionOnMouseUp}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            setEditing(false)
            commit(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
    </div>
  )
}

function format(value: number, precision: number, grouped: boolean): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(precision)
  if (!grouped) return text
  /* Commas in the whole-number part only. Typed commas are stripped when the
     entry is committed, so an edited value never keeps a stray one. */
  const [int, frac] = text.split('.')
  const withCommas = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac != null ? `${withCommas}.${frac}` : withCommas
}
