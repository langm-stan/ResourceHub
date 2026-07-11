/*
 * Balance sheet + budget data model.
 *
 * The balance sheet keeps the fixed group taxonomy of the Stanford "Balance
 * Sheet Template" workbook (Liquid / Investment / Real Estate / Other assets,
 * Short-Term / Long-Term liabilities) — lib/exportExcel.ts mirrors that layout
 * — but the rows *inside* each group are free-form: users add, rename, and
 * remove their own line items instead of filling in a wall of preset $0 fields.
 *
 * The budget is fully free-form: "money in" and "money out" line items.
 */

/* `actual` only exists on budget expense rows: what was really spent, next to
 * the planned amount. Balance-sheet and income rows never set it. */
export type LineItem = { key: string; label: string; value: number; actual?: number }
export type AccountGroup = { key: string; label: string; items: LineItem[] }

export function newLineItem(label = '', value = 0): LineItem {
  return { key: `li-${Math.random().toString(36).slice(2, 10)}`, label, value }
}

export function sumItems(items: LineItem[]): number {
  return items.reduce((s, i) => s + (Number.isFinite(i.value) ? i.value : 0), 0)
}

export function sumActuals(items: LineItem[]): number {
  return items.reduce((s, i) => s + (typeof i.actual === 'number' && Number.isFinite(i.actual) ? i.actual : 0), 0)
}

export function hasActuals(items: LineItem[]): boolean {
  return items.some((i) => typeof i.actual === 'number' && Number.isFinite(i.actual))
}

/* Plain-language "what belongs here" per balance-sheet group, keyed by group
 * key. Kept out of the persisted snapshot so wording can change freely. */
export const GROUP_HINTS: Record<string, string> = {
  liquid: 'Money you can get to quickly: checking, savings, money market accounts, CDs, cash.',
  investment: 'Money working long-term: stocks, bonds, mutual funds and ETFs, retirement accounts, college savings plans.',
  'real-estate': 'Your home or other property, at what it would sell for today.',
  other: 'Vehicles, jewelry, collectibles, and anything else valuable you could sell.',
  'short-term': 'Debts due within a year: credit card balances, medical bills.',
  'long-term': 'Debts you pay down over years: student loans, auto loans, mortgages.',
}

export const ASSET_GROUPS: AccountGroup[] = [
  {
    key: 'liquid',
    label: 'Liquid Assets',
    items: [
      { key: 'cash', label: 'Cash / Checking Accounts', value: 3200 },
      { key: 'savings', label: 'Savings / Money Market Accounts', value: 8500 },
    ],
  },
  {
    key: 'investment',
    label: 'Investment Assets',
    items: [
      { key: 'stocks', label: 'Stocks', value: 4200 },
      { key: 'funds', label: 'Mutual Funds and ETFs', value: 6100 },
      { key: 'retirement', label: 'Retirement Accounts', value: 18400 },
    ],
  },
  {
    key: 'real-estate',
    label: 'Real Estate Assets',
    items: [],
  },
  {
    key: 'other',
    label: 'Other Assets',
    items: [
      { key: 'vehicles', label: 'Vehicle(s)', value: 9500 },
      { key: 'other-asset', label: 'Other', value: 500 },
    ],
  },
]

export const LIABILITY_GROUPS: AccountGroup[] = [
  {
    key: 'short-term',
    label: 'Short-Term Liabilities',
    items: [{ key: 'credit-card', label: 'Credit Card Balance(s)', value: 2100 }],
  },
  {
    key: 'long-term',
    label: 'Long-Term Liabilities',
    items: [
      { key: 'auto', label: 'Auto Loans', value: 6200 },
      { key: 'student', label: 'Student Loans', value: 21000 },
    ],
  },
]

/*
 * The blank-slate starting point, used when a visitor clears their data (and
 * for anyone who wants to begin from scratch): the exact line items of the
 * printed Stanford Balance Sheet Template, all at $0, plus starter budget
 * rows. Users can delete or rename any row; hitting Clear brings these back.
 */
export const STARTER_ASSET_GROUPS: AccountGroup[] = [
  {
    key: 'liquid',
    label: 'Liquid Assets',
    items: [
      { key: 'cash', label: 'Cash / Checking Accounts', value: 0 },
      { key: 'savings', label: 'Savings / Money Market Accounts', value: 0 },
      { key: 'cds', label: 'Certificates of Deposit', value: 0 },
      { key: 'other-liquid', label: 'Other Liquid Assets', value: 0 },
    ],
  },
  {
    key: 'investment',
    label: 'Investment Assets',
    items: [
      { key: 'stocks', label: 'Stocks', value: 0 },
      { key: 'bonds', label: 'Bonds', value: 0 },
      { key: 'funds', label: 'Mutual Funds and ETFs', value: 0 },
      { key: 'retirement', label: 'Retirement Accounts', value: 0 },
      { key: 'college', label: 'College Savings Plans', value: 0 },
      { key: 'other-investment', label: 'Other Investment Assets', value: 0 },
    ],
  },
  {
    key: 'real-estate',
    label: 'Real Estate Assets',
    items: [
      { key: 'home', label: 'Home', value: 0 },
      { key: 'other-re', label: 'Other Real Estate Assets', value: 0 },
    ],
  },
  {
    key: 'other',
    label: 'Other Assets',
    items: [
      { key: 'vehicles', label: 'Vehicle(s)', value: 0 },
      { key: 'jewelry', label: 'Jewelry', value: 0 },
      { key: 'other-asset', label: 'Other', value: 0 },
    ],
  },
]

export const STARTER_LIABILITY_GROUPS: AccountGroup[] = [
  {
    key: 'short-term',
    label: 'Short-Term Liabilities',
    items: [
      { key: 'credit-card', label: 'Credit Card Balance(s)', value: 0 },
      { key: 'medical', label: 'Medical Debt', value: 0 },
      { key: 'other-short', label: 'Other Short-Term Liabilities', value: 0 },
    ],
  },
  {
    key: 'long-term',
    label: 'Long-Term Liabilities',
    items: [
      { key: 'auto', label: 'Auto Loans', value: 0 },
      { key: 'student', label: 'Student Loans', value: 0 },
      { key: 'mortgage', label: 'Mortgages', value: 0 },
      { key: 'other-long', label: 'Other Long-Term Liabilities', value: 0 },
    ],
  },
]

export const STARTER_INCOME: LineItem[] = [
  { key: 'income-1', label: 'Income source #1', value: 0 },
  { key: 'income-2', label: 'Income source #2', value: 0 },
]

export const STARTER_EXPENSES: LineItem[] = [
  { key: 'rent', label: 'Rent / Mortgage', value: 0 },
  { key: 'utilities', label: 'Utilities & phone', value: 0 },
  { key: 'groceries', label: 'Groceries & food', value: 0 },
  { key: 'transportation', label: 'Transportation', value: 0 },
  { key: 'insurance', label: 'Insurance', value: 0 },
  { key: 'debt', label: 'Debt payments', value: 0 },
  { key: 'entertainment', label: 'Entertainment & subscriptions', value: 0 },
  { key: 'other-expense', label: 'Other', value: 0 },
]

export const INCOME_ITEMS: LineItem[] = [
  { key: 'take-home', label: 'Take-home pay', value: 4000 },
  { key: 'side', label: 'Side income', value: 300 },
]

export const EXPENSE_ITEMS: LineItem[] = [
  { key: 'rent', label: 'Rent', value: 1500, actual: 1500 },
  { key: 'groceries', label: 'Groceries', value: 500, actual: 640 },
  { key: 'transportation', label: 'Transportation', value: 300, actual: 280 },
  { key: 'utilities', label: 'Utilities & phone', value: 250, actual: 250 },
  { key: 'debt', label: 'Debt payments', value: 400, actual: 400 },
  { key: 'everything-else', label: 'Everything else', value: 600, actual: 810 },
]
