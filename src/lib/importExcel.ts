/*
 * Read back the Excel files this tool exports (lib/exportExcel.ts), so the
 * whole file story is one format: download the Excel, edit or keep it, upload
 * it later to pick up where you left off.
 *
 * The parsers are deliberately forgiving: users open these files in Excel and
 * add rows, rename labels, or change amounts. Structure is recovered from the
 * section headings ("Liquid Assets" ... "Subtotal - ..."), not row positions.
 */
import * as XLSX from 'xlsx'
import {
  STARTER_ASSET_GROUPS,
  STARTER_LIABILITY_GROUPS,
  newLineItem,
  type AccountGroup,
  type LineItem,
} from '../data/checkupData'

type Row = (string | number | undefined)[]

export interface ParsedStatement {
  assets?: AccountGroup[]
  liabilities?: AccountGroup[]
  income?: LineItem[]
  expenses?: LineItem[]
}

const asLabel = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const asAmount = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Walk one two-column region (labels at `col`, amounts at `col + 1`) and
 * collect the groups it contains. A group starts at a row whose label matches
 * a known group name and whose amount cell says "Amount"; it ends at its
 * "Subtotal - ..." row.
 */
function parseGroupColumn(rows: Row[], col: number, template: AccountGroup[]): AccountGroup[] {
  const byLabel = new Map(template.map((g) => [g.label.toLowerCase(), g]))
  const found = new Map<string, LineItem[]>()

  let current: AccountGroup | null = null
  let items: LineItem[] = []
  for (const row of rows) {
    const label = asLabel(row[col])
    if (!label) continue
    const lower = label.toLowerCase()

    if (byLabel.has(lower) && asLabel(row[col + 1]).toLowerCase() === 'amount') {
      current = byLabel.get(lower)!
      items = []
      found.set(current.key, items)
      continue
    }
    if (!current) continue
    if (lower.startsWith('subtotal') || lower.startsWith('total')) {
      current = null
      continue
    }
    items.push({ ...newLineItem(label, asAmount(row[col + 1])) })
  }

  // Groups the file does not mention fall back to the empty template group,
  // so the fixed structure (and the Excel re-export) stays intact.
  return template.map((g) => ({
    ...g,
    items: found.get(g.key) ?? [],
  }))
}

/** Collect simple label/amount rows between a section header and its total row. */
function parseSection(rows: Row[], header: string, totalPrefix: string): LineItem[] {
  const items: LineItem[] = []
  let inSection = false
  for (const row of rows) {
    const label = asLabel(row[0])
    if (!label) continue
    const lower = label.toLowerCase()
    if (lower === header) {
      inSection = true
      continue
    }
    if (!inSection) continue
    if (lower.startsWith(totalPrefix)) break
    items.push({ ...newLineItem(label, asAmount(row[1])) })
  }
  return items
}

/**
 * Parse an uploaded .xlsx produced by this tool. Every worksheet in the
 * workbook is inspected, so a file holding both a balance sheet and a budget
 * restores both statements in one upload. Returns null when no sheet is
 * recognizable as one of ours.
 */
export function parseStatementXlsx(data: ArrayBuffer): ParsedStatement | null {
  const wb = XLSX.read(data, { type: 'array' })
  const result: ParsedStatement = {}

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1 })
    const title = asLabel(rows[0]?.[0]).toLowerCase()

    if (title === 'balance sheet') {
      result.assets = parseGroupColumn(rows, 1, STARTER_ASSET_GROUPS)
      result.liabilities = parseGroupColumn(rows, 6, STARTER_LIABILITY_GROUPS)
    } else if (title === 'monthly budget') {
      result.income = parseSection(rows, 'money in', 'total income')
      result.expenses = parseSection(rows, 'money out', 'total expenses')
    }
  }

  return result.assets || result.income ? result : null
}
