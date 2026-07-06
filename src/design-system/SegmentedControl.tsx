import styles from './SegmentedControl.module.css'

export interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label?: string
  options: Segment<T>[]
  value: T
  onChange: (value: T) => void
}

/** A row of mutually-exclusive options. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.group} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? `${styles.segment} ${styles.active}` : styles.segment}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
