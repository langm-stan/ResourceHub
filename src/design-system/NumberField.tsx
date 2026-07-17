import { useEffect, useId, useState } from 'react'
import styles from './NumberField.module.css'

interface NumberFieldProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  precision?: number
}

/**
 * A precise numeric input. The displayed string is local while focused, and
 * committed/clamped on blur or Enter. Figures render in tabular mono.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  precision = 2,
}: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<string>(format(value, precision))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(format(value, precision))
  }, [value, precision, editing])

  function commit(raw: string) {
    const cleaned = raw.replace(/[^0-9.\-]/g, '')
    const parsed = Number(cleaned)
    // An empty or unparseable entry reverts to the previous value rather than
    // committing 0 (Number('') is 0).
    if (cleaned === '' || Number.isNaN(parsed)) {
      setDraft(format(value, precision))
      return
    }
    let next = parsed
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    // Round to the field's precision so the stored value matches the display.
    const factor = 10 ** precision
    next = Math.round(next * factor) / factor
    onChange(next)
    setDraft(format(next, precision))
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
          value={draft}
          step={step}
          onFocus={() => setEditing(true)}
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

function format(value: number, precision: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(precision)
}
