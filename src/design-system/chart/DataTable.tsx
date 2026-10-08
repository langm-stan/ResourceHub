import styles from './ChartFrame.module.css'

/** A chart's numbers as plain rows, for readers who cannot use the picture. */
export interface ChartTable {
  /** Column headings; the first names what each row is (a year, an age). */
  columns: string[]
  /** One row per point; the first cell is the row's own heading. */
  rows: string[][]
}

export function DataTable({ columns, rows }: ChartTable) {
  return (
    <table className={styles.dataTable}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) =>
              j === 0 ? (
                <th key={j} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={j} className="tnum">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
