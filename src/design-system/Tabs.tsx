import { useEffect, useRef } from 'react'
import styles from './Tabs.module.css'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** 'lg' when the tabs are the tool's primary navigation rather than a sub-surface switch. */
  size?: 'md' | 'lg'
}

/** Friendly pill tabs for switching analytic surfaces within a tool. */
export function Tabs<T extends string>({ items, value, onChange, size = 'md' }: TabsProps<T>) {
  // On a phone the tabs are one row that scrolls sideways (see the
  // stylesheet), so the chosen tab is brought into view. Only the row moves:
  // scrollIntoView would also pull the page up or down to it.
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = row.current
    const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el || !tab || el.scrollWidth <= el.clientWidth) return
    const left = tab.offsetLeft - el.offsetLeft
    if (left < el.scrollLeft) el.scrollLeft = left - 16
    else if (left + tab.offsetWidth > el.scrollLeft + el.clientWidth)
      el.scrollLeft = left + tab.offsetWidth - el.clientWidth + 16
  }, [value])

  return (
    <div
      ref={row}
      className={size === 'lg' ? `${styles.tabs} ${styles.lg}` : styles.tabs}
      role="tablist"
    >
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
