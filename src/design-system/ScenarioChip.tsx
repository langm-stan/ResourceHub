import styles from './ScenarioChip.module.css'

interface ScenarioChipProps {
  label: string
  swatch?: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
}

/** A selectable pill for presets and comparison curves. */
export function ScenarioChip({
  label,
  swatch,
  active,
  onClick,
  onRemove,
}: ScenarioChipProps) {
  return (
    <span className={active ? `${styles.chip} ${styles.active}` : styles.chip}>
      <button type="button" className={styles.main} onClick={onClick} aria-pressed={active}>
        {swatch && (
          <span className={styles.swatch} style={{ background: swatch }} aria-hidden="true" />
        )}
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
