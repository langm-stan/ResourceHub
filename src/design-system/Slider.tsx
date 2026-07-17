import { useId, useState } from 'react'
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
  /** Replace the text readout with a typed input, committed on blur or Enter and clamped to [min, max]. */
  editable?: boolean
  /** Shown inside the editable input, e.g. "$" or "months". */
  prefix?: string
  suffix?: string
  /** Decimal places kept when committing a typed value (default 0). */
  precision?: number
  /** Ceiling for typed values when it exceeds the track's max; the slider still ends at max. */
  inputMax?: number
}

/** A labeled range control with a tabular-mono readout (optionally a typed input). */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  readout,
  note,
  editable = false,
  prefix,
  suffix,
  precision = 0,
  inputMax,
}: SliderProps) {
  const id = useId()
  const pct = max === min ? 0 : Math.min(100, ((value - min) / (max - min)) * 100)
  // While the user types, the field shows their raw draft; otherwise the
  // committed value, grouped for readability.
  const [draft, setDraft] = useState<string | null>(null)

  function commit(raw: string) {
    setDraft(null)
    const cleaned = raw.replace(/[^0-9.\-]/g, '')
    const n = Number(cleaned)
    // An empty or unparseable entry (Number('') is 0) reverts to the value.
    if (cleaned === '' || !Number.isFinite(n)) return
    const factor = 10 ** precision
    onChange(Math.min(inputMax ?? max, Math.max(min, Math.round(n * factor) / factor)))
  }

  return (
    <div className={styles.field}>
      <div className={styles.top}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {editable ? (
          <span className={styles.inputWrap}>
            {prefix && <span className={styles.affix}>{prefix}</span>}
            <input
              className={`${styles.readInput} tnum`}
              inputMode="decimal"
              value={draft ?? value.toLocaleString('en-US')}
              aria-label={label}
              onFocus={(e) => {
                setDraft(String(value))
                e.target.select()
              }}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commit((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            {suffix && <span className={styles.affix}>{suffix}</span>}
          </span>
        ) : (
          readout != null && <span className={`${styles.readout} tnum`}>{readout}</span>
        )}
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
