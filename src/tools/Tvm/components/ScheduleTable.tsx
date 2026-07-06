import { formatUSDWhole } from '../../../lib/format'
import type { YearRow } from '../compute'
import styles from './ScheduleTable.module.css'

export function ScheduleTable({ rows }: { rows: YearRow[] }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Year</th>
            <th className={styles.num}>Interest paid</th>
            <th className={styles.num}>Principal paid</th>
            <th className={styles.num}>Balance left</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td className={`${styles.num} tnum`}>{formatUSDWhole(r.interest)}</td>
              <td className={`${styles.num} tnum`}>{formatUSDWhole(r.principal)}</td>
              <td className={`${styles.num} tnum`}>{formatUSDWhole(r.balanceEnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
