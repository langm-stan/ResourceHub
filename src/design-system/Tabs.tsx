import styles from './Tabs.module.css'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

/** Friendly pill tabs for switching analytic surfaces within a tool. */
export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            className={active ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
