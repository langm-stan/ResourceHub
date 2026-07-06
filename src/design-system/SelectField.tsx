import { useId } from 'react'
import styles from './SelectField.module.css'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

/**
 * A labeled native select, styled to sit beside NumberField in a control
 * grid. Native so long lists (all fifty states) stay keyboard-searchable.
 */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string
  value: T
  onChange: (value: T) => void
  options: readonly SelectOption<T>[]
}) {
  const id = useId()
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrap}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </div>
    </div>
  )
}
