import { useId } from 'react'
import styles from './Slider.module.css'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  readout?: string
  note?: string
}

/** A labeled range control with a tabular-mono readout. */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  readout,
  note,
}: SliderProps) {
  const id = useId()
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div className={styles.field}>
      <div className={styles.top}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {readout != null && <span className={`${styles.readout} tnum`}>{readout}</span>}
      </div>
      <input
        id={id}
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${pct}%` }}
      />
      {note && <span className={styles.note}>{note}</span>}
    </div>
  )
}
