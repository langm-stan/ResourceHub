import { useId } from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  note?: string
}

/** A labeled switch for optional features. */
export function Toggle({ label, checked, onChange, note }: ToggleProps) {
  const id = useId()
  return (
    <div className={styles.row}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={checked ? `${styles.track} ${styles.on}` : styles.track}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
      <label htmlFor={id} className={styles.labelWrap}>
        <span className={styles.label}>{label}</span>
        {note && <span className={styles.note}>{note}</span>}
      </label>
    </div>
  )
}
