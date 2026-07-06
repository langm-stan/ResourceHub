import { useCountUp } from '../hooks/useCountUp'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: number
  format: (v: number) => string
  note?: string
  emphasis?: boolean
  accentColor?: string
  animate?: boolean
}

/** A headline figure: big number with an editorial label and count-up. */
export function Stat({
  label,
  value,
  format,
  note,
  emphasis = false,
  accentColor,
  animate = true,
}: StatProps) {
  const animated = useCountUp(animate ? value : value)
  const shown = animate ? animated : value
  return (
    <div className={emphasis ? `${styles.stat} ${styles.emphasis}` : styles.stat}>
      <span className={styles.label}>{label}</span>
      <span
        className={`${styles.value} tnum`}
        style={accentColor ? { color: accentColor } : undefined}
      >
        {format(shown)}
      </span>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  )
}
