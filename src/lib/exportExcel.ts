import * as XLSX from 'xlsx'
import { hasActuals, sumActuals, sumItems, type AccountGroup, type LineItem } from '../data/checkupData'
import { sumGroups } from '../hooks/useFinancialSnapshot'

function groupSubtotal(g: AccountGroup) {
  return g.items.reduce((s, i) => s + i.value, 0)
}

// Mirrors the structure of the original "Balance Sheet Template" workbook:
// Assets (Liquid / Investment / Real Estate / Other) in columns B-C,
// Liabilities (Short-Term / Long-Term) in columns G-H, ratios in columns J-K.
export function exportBalanceSheetXlsx(assets: AccountGroup[], liabilities: AccountGroup[]) {
  const totalAssets = sumGroups(assets)
  const totalLiabilities = sumGroups(liabilities)
  const netWorth = totalAssets - totalLiabilities
  const liquid = assets.find((g) => g.key === 'liquid')
  const shortTerm = liabilities.find((g) => g.key === 'short-term')
  const liquidTotal = liquid ? groupSubtotal(liquid) : 0
  const shortTermTotal = shortTerm ? groupSubtotal(shortTerm) : 0

  const rows: (string | number)[][] = []
  const push = (r: (string | number)[]) => rows.push(r)

  push(['Balance Sheet'])
  push([])
  push(['', 'Assets', '', '', '', '', 'Liabilities', '', '', 'Balance Sheet Ratios:'])
  push(['', '', '', '', '', '', '', '', '', 'Liquid Assets / Total Assets', totalAssets ? liquidTotal / totalAssets : 0])

  assets.forEach((group) => {
    push(['', group.label, 'Amount'])
    group.items.forEach((item) => push(['', item.label, item.value]))
    push(['', `Subtotal - ${group.label}`, groupSubtotal(group)])
    push([])
  })

  push(['', 'Total Assets', totalAssets])
  push([])
  push(['', '', 'Net Worth = Total Assets - Total Liabilities'])
  push(['', '', 'Net Worth', '', '', '', netWorth])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Write liabilities + ratios into columns G (7th, index 6) onward on the rows already created for assets.
  ws['G3'] = { t: 's', v: 'Liabilities' }
  let liabRowIdx = 3
  liabilities.forEach((group) => {
    XLSX.utils.sheet_add_aoa(ws, [[group.label, 'Amount']], { origin: { r: liabRowIdx, c: 6 } })
    liabRowIdx++
    group.items.forEach((item) => {
      XLSX.utils.sheet_add_aoa(ws, [[item.label, item.value]], { origin: { r: liabRowIdx, c: 6 } })
      liabRowIdx++
    })
    XLSX.utils.sheet_add_aoa(ws, [[`Subtotal - ${group.label}`, groupSubtotal(group)]], {
      origin: { r: liabRowIdx, c: 6 },
    })
    liabRowIdx++
    liabRowIdx++
  })
  XLSX.utils.sheet_add_aoa(ws, [['Total Liabilities', totalLiabilities]], { origin: { r: liabRowIdx, c: 6 } })

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['Short-Term Debt / Liquid Assets', liquidTotal ? shortTermTotal / liquidTotal : 0],
      ['Total Liabilities / Total Assets', totalAssets ? totalLiabilities / totalAssets : 0],
      ['Total Liabilities / Net Worth', netWorth ? totalLiabilities / netWorth : 0],
    ],
    { origin: { r: 4, c: 9 } }
  )

  ws['!cols'] = [{ wch: 2 }, { wch: 28 }, { wch: 12 }, { wch: 2 }, { wch: 2 }, { wch: 2 }, { wch: 28 }, { wch: 12 }, { wch: 2 }, { wch: 30 }, { wch: 10 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet')
  XLSX.writeFile(wb, `ifdm-balance-sheet-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportBudgetXlsx(income: LineItem[], expenses: LineItem[], saving: LineItem[]) {
  const totalIncome = sumItems(income)
  const totalExpenses = sumItems(expenses)
  const totalActual = sumActuals(expenses)
  const anyActuals = hasActuals(expenses)
  const totalSaving = sumItems(saving)
  const leftover = totalIncome - totalExpenses - totalSaving
  const investable = Math.max(0, totalIncome - totalExpenses)

  const rows: (string | number)[][] = [
    ['Monthly Budget'],
    [],
    ['Money In', 'Amount'],
    ...income.map((i) => [i.label, i.value]),
    ['Total income', totalIncome],
    [],
    ['Money Out', 'Planned', 'Actual', 'Share of planned'],
    ...expenses.map((i) => [
      i.label,
      i.value,
      typeof i.actual === 'number' && Number.isFinite(i.actual) ? i.actual : '',
      totalExpenses > 0 ? i.value / totalExpenses : 0,
    ]),
    ['Total expenses', totalExpenses, anyActuals ? totalActual : ''],
    [],
    ['Saving', 'Amount'],
    ...saving.map((i) => [i.label, i.value]),
    ['Total saving', totalSaving],
    [],
    ['Left over each month', leftover],
    ['Investable each month', investable],
    ['Savings rate', totalIncome > 0 ? investable / totalIncome : 0],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Budget')
  XLSX.writeFile(wb, `ifdm-budget-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
