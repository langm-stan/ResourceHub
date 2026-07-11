import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ASSET_GROUPS,
  LIABILITY_GROUPS,
  INCOME_ITEMS,
  EXPENSE_ITEMS,
  SAVING_ITEMS,
  STARTER_ASSET_GROUPS,
  STARTER_LIABILITY_GROUPS,
  STARTER_INCOME,
  STARTER_EXPENSES,
  STARTER_SAVING,
  splitSavingRows,
  sumItems,
  type AccountGroup,
  type LineItem,
} from '../data/checkupData'
import { parseStatementXlsx } from '../lib/importExcel'

const CURRENT_KEY = 'ifdm-snapshot-current-v1'
const HISTORY_KEY = 'ifdm-snapshot-history-v1'
const IS_EXAMPLE_KEY = 'ifdm-snapshot-is-example-v1'
const MAX_HISTORY = 36

export type Snapshot = {
  assets: AccountGroup[]
  liabilities: AccountGroup[]
  income: LineItem[]
  expenses: LineItem[]
  /** Pay-yourself-first rows: money kept, not spent; feeds "investable each month". */
  saving: LineItem[]
}

export type HistoryPoint = { date: string; netWorth: number }

const EXAMPLE_SNAPSHOT: Snapshot = {
  assets: ASSET_GROUPS,
  liabilities: LIABILITY_GROUPS,
  income: INCOME_ITEMS,
  expenses: EXPENSE_ITEMS,
  saving: SAVING_ITEMS,
}

// Clearing does not empty the sheet: it restores the Stanford template's line
// items at $0, so a fresh start still shows where to begin.
const BLANK_SNAPSHOT: Snapshot = {
  assets: STARTER_ASSET_GROUPS,
  liabilities: STARTER_LIABILITY_GROUPS,
  income: STARTER_INCOME,
  expenses: STARTER_EXPENSES,
  saving: STARTER_SAVING,
}

/*
 * Accepts either the current snapshot shape or the pre-merge one (fixed budget
 * categories with budgeted/spent amounts plus a single income number) that may
 * still be sitting in localStorage or in an exported .json file. Returns null
 * for anything unrecognizable.
 */
function coerceSnapshot(parsed: unknown): Snapshot | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>
  if (!Array.isArray(p.assets) || !Array.isArray(p.liabilities)) return null

  const assets = p.assets as AccountGroup[]
  const liabilities = p.liabilities as AccountGroup[]

  // Current shape: income and expenses are line-item arrays. Snapshots from
  // before the saving list existed carry saving rows inside expenses; pull
  // them out so nothing is lost.
  if (Array.isArray(p.income) && Array.isArray(p.expenses)) {
    if (Array.isArray(p.saving)) {
      return {
        assets,
        liabilities,
        income: p.income as LineItem[],
        expenses: p.expenses as LineItem[],
        saving: p.saving as LineItem[],
      }
    }
    const split = splitSavingRows(p.expenses as LineItem[])
    return {
      assets,
      liabilities,
      income: p.income as LineItem[],
      expenses: split.expenses,
      saving: split.saving.length ? split.saving : STARTER_SAVING,
    }
  }

  // Legacy shape: budget categories (budgeted/spent) + a single income number.
  // Budgeted amounts become "money out" rows (spent, when recorded, becomes
  // the row's actual); the income number becomes one "money in" row.
  if (Array.isArray(p.budget)) {
    type LegacyCategory = { key: string; label: string; budgeted: number; spent?: number }
    const income: LineItem[] =
      typeof p.income === 'number' && p.income !== 0
        ? [{ key: 'income', label: 'Monthly income', value: p.income }]
        : []
    const mapped: LineItem[] = (p.budget as LegacyCategory[]).map((c) => ({
      key: c.key,
      label: c.label,
      value: c.budgeted,
      ...(typeof c.spent === 'number' && Number.isFinite(c.spent) && c.spent !== 0 ? { actual: c.spent } : null),
    }))
    const split = splitSavingRows(mapped)
    return {
      assets,
      liabilities,
      income,
      expenses: split.expenses,
      saving: split.saving.length ? split.saving : STARTER_SAVING,
    }
  }

  return null
}

function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (!raw) return EXAMPLE_SNAPSHOT
    return coerceSnapshot(JSON.parse(raw)) ?? EXAMPLE_SNAPSHOT
  } catch {
    return EXAMPLE_SNAPSHOT
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function sumGroups(groups: AccountGroup[]) {
  return groups.reduce((s, g) => s + sumItems(g.items), 0)
}

export function useFinancialSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot>(loadSnapshot)
  const [history, setHistory] = useState<HistoryPoint[]>(() => loadJSON(HISTORY_KEY, []))
  // True only while the fields still hold the untouched example numbers a first-time
  // visitor sees — cleared the moment they edit anything, load a file, or wipe their data.
  // Persisted under its own key (rather than inferred from CURRENT_KEY's presence) so it
  // survives React StrictMode's dev-mode mount/unmount/remount cycle correctly.
  const [isExampleData, setIsExampleData] = useState(() => {
    const stored = localStorage.getItem(IS_EXAMPLE_KEY)
    return stored !== null ? stored === 'true' : localStorage.getItem(CURRENT_KEY) === null
  })

  // After "Clear my data", nothing is written back to localStorage until the
  // user edits again — so the freshly cleared template is shown now, but a
  // refresh starts over like a first visit (example numbers and banner).
  const suppressPersist = useRef(false)

  useEffect(() => {
    if (suppressPersist.current) return
    localStorage.setItem(CURRENT_KEY, JSON.stringify(snapshot))
  }, [snapshot])

  useEffect(() => {
    if (suppressPersist.current) return
    localStorage.setItem(IS_EXAMPLE_KEY, String(isExampleData))
  }, [isExampleData])

  const totalAssets = sumGroups(snapshot.assets)
  const totalLiabilities = sumGroups(snapshot.liabilities)
  const netWorth = totalAssets - totalLiabilities
  const totalIncome = sumItems(snapshot.income)
  const totalExpenses = sumItems(snapshot.expenses)
  const totalSaving = sumItems(snapshot.saving)

  const setGroupItems = useCallback(
    (kind: 'assets' | 'liabilities', groupKey: string, items: LineItem[]) => {
      suppressPersist.current = false
      setIsExampleData(false)
      setSnapshot((prev) => ({
        ...prev,
        [kind]: prev[kind].map((g) => (g.key === groupKey ? { ...g, items } : g)),
      }))
    },
    []
  )

  const setIncomeItems = useCallback((income: LineItem[]) => {
    suppressPersist.current = false
    setIsExampleData(false)
    setSnapshot((prev) => ({ ...prev, income }))
  }, [])

  const setExpenseItems = useCallback((expenses: LineItem[]) => {
    suppressPersist.current = false
    setIsExampleData(false)
    setSnapshot((prev) => ({ ...prev, expenses }))
  }, [])

  const setSavingItems = useCallback((saving: LineItem[]) => {
    suppressPersist.current = false
    setIsExampleData(false)
    setSnapshot((prev) => ({ ...prev, saving }))
  }, [])

  // The net worth trend records itself: whenever the user's numbers change, the
  // day's history point is written (one per day, latest value wins). Example
  // data and an empty sheet are never recorded.
  useEffect(() => {
    if (isExampleData) return
    if (totalAssets === 0 && totalLiabilities === 0) return
    const today = new Date().toISOString().slice(0, 10)
    setHistory((prev) => {
      const existing = prev.find((p) => p.date === today)
      if (existing && existing.netWorth === netWorth) return prev
      const next = [...prev.filter((p) => p.date !== today), { date: today, netWorth }].slice(-MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [netWorth, totalAssets, totalLiabilities, isExampleData])

  /*
   * Bring back a previously downloaded file. Excel is the format users see;
   * a balance-sheet file restores assets and liabilities, a budget file
   * restores income and expenses, and the other statement keeps its current
   * numbers. Old JSON snapshot files from earlier versions still work.
   */
  const importFile = useCallback((file: File) => {
    if (file.name.toLowerCase().endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const next = coerceSnapshot(JSON.parse(reader.result as string))
          if (next) {
            suppressPersist.current = false
            setIsExampleData(false)
            setSnapshot(next)
          }
        } catch {
          // Ignore malformed files.
        }
      }
      reader.readAsText(file)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseStatementXlsx(reader.result as ArrayBuffer)
        if (!parsed) return
        const wasExample = isExampleData
        suppressPersist.current = false
        setIsExampleData(false)
        setSnapshot((prev) => {
          // Files from before the Saving section carry saving rows inside
          // Money Out; pull them out rather than losing the distinction.
          let expenses = parsed.expenses
          let saving = parsed.saving
          if (expenses && !saving) {
            const split = splitSavingRows(expenses)
            expenses = split.expenses
            saving = split.saving.length ? split.saving : STARTER_SAVING
          }
          const next = {
            ...prev,
            ...(parsed.assets ? { assets: parsed.assets } : null),
            ...(parsed.liabilities ? { liabilities: parsed.liabilities } : null),
            ...(parsed.income ? { income: parsed.income } : null),
            ...(expenses ? { expenses } : null),
            ...(saving ? { saving } : null),
          }
          // An upload overrides what's on screen. If the file carries only one
          // statement and the other side still shows the example numbers,
          // reset that side to the blank template rather than keeping data
          // the user never entered.
          if (wasExample) {
            if (!parsed.assets) {
              next.assets = STARTER_ASSET_GROUPS
              next.liabilities = STARTER_LIABILITY_GROUPS
            }
            if (!parsed.income) {
              next.income = STARTER_INCOME
              next.expenses = STARTER_EXPENSES
              next.saving = STARTER_SAVING
            }
          }
          return next
        })
      } catch {
        // Not one of our files; leave the current numbers untouched.
      }
    }
    reader.readAsArrayBuffer(file)
  }, [isExampleData])

  const loadExampleData = useCallback(() => {
    suppressPersist.current = false
    setIsExampleData(true)
    setSnapshot(EXAMPLE_SNAPSHOT)
  }, [])

  // Wipes everything this tool has stored in this browser — the right move before
  // walking away from a shared or public computer.
  const clearAll = useCallback(() => {
    localStorage.removeItem(CURRENT_KEY)
    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(IS_EXAMPLE_KEY)
    suppressPersist.current = true
    setIsExampleData(false)
    setSnapshot(BLANK_SNAPSHOT)
    setHistory([])
  }, [])

  return {
    snapshot,
    history,
    totalAssets,
    totalLiabilities,
    netWorth,
    totalIncome,
    totalExpenses,
    totalSaving,
    isExampleData,
    setGroupItems,
    setIncomeItems,
    setExpenseItems,
    setSavingItems,
    importFile,
    loadExampleData,
    clearAll,
  }
}
